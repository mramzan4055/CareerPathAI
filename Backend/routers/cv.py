import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pypdf import PdfReader

from auth import get_current_user_id
from config import settings
from database import get_supabase
from models import CVData, CVResponse, ResumeReviewResponse
from services.ai_client import get_ai_client

router = APIRouter(prefix="/api/v1/parser", tags=["CV Parser"])

@router.post("/resume", response_model=CVResponse)
async def parse_resume(
    file: UploadFile = File(...),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Parses a PDF resume and returns structured JSON data.
    """
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    try:
        # 1. Extract text from PDF
        pdf_reader = PdfReader(file.file)
        raw_text = ""
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                raw_text += text + "\n"
        
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        # 2. Strict Prompt so Llama / Gemini extracts all ATS CV sections
        system_prompt = (
            "You are an expert AI Resume Parser. Analyze the provided resume text and extract information "
            "strictly into the following JSON format. "
            "Do not include any conversational text, markdown, or code blocks. Return ONLY the raw JSON.\n\n"
            "Required JSON Structure:\n"
            "{\n"
            "  \"name\": \"Full Name\",\n"
            "  \"location\": \"City, Country or empty\",\n"
            "  \"phone\": \"Phone Number or empty\",\n"
            "  \"email\": \"Professional Email or empty\",\n"
            "  \"linkedin\": \"LinkedIn Link or empty\",\n"
            "  \"github\": \"GitHub/Portfolio Link or empty\",\n"
            "  \"summary\": \"3 to 4 sentence professional summary/elevator pitch\",\n"
            "  \"skills\": [\"Combined list of all core technical skills for compatibility (e.g. Python, SQL, React)\"],\n"
            "  \"skills_breakdown\": {\n"
            "       \"languages\": [\"Languages list, e.g. Python, SQL\"],\n"
            "       \"frameworks\": [\"Frameworks/libraries, e.g. React, Django\"],\n"
            "       \"databases\": [\"Databases/Tools, e.g. Docker, Git, PostgreSQL\"],\n"
            "       \"ml_domain\": [\"Machine learning/domain, e.g. Scikit-learn, NLP, REST APIs\"]\n"
            "  },\n"
            "  \"projects\": [\n"
            "       {\n"
            "           \"title\": \"Project Name\",\n"
            "           \"tech_stack\": [\"Tech Stack Used\"],\n"
            "           \"points\": [\"Action bullet points describing project accomplishments\"]\n"
            "       }\n"
            "  ],\n"
            "  \"experience\": [\"Brief single sentence summary lines for compatibility\"],\n"
            "  \"experience_details\": [\n"
            "       {\n"
            "           \"title\": \"Job Title\",\n"
            "           \"company\": \"Company Name\",\n"
            "           \"location\": \"Location\",\n"
            "           \"dates\": \"Dates (e.g., 2022 - 2024)\",\n"
            "           \"points\": [\"Action verb bullet points summarizing achievements\"]\n"
            "       }\n"
            "  ],\n"
            "  \"education\": [\n"
            "       {\n"
            "           \"degree\": \"Degree Name\",\n"
            "           \"institution\": \"Institution Name\",\n"
            "           \"location\": \"Location\",\n"
            "           \"dates\": \"Graduation Dates\",\n"
            "           \"highlights\": \"Academic Highlights\"\n"
            "       }\n"
            "  ],\n"
            "  \"certifications\": [\n"
            "       {\n"
            "           \"title\": \"Certification Title\",\n"
            "           \"issuer\": \"Issuing Organization\",\n"
            "           \"date\": \"Month Year\"\n"
            "       }\n"
            "  ]\n"
            "}"
        )

        # 3. Call LLM (with Gemini fallback)
        ai_result = ""
        try:
            ai_client = await get_ai_client()
            response = await ai_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Resume Text:\n{raw_text}"}
                ],
                temperature=0.2
            )
            ai_result = response.choices[0].message.content.strip()
        except Exception as groq_error:
            import logging
            logging.getLogger(__name__).warning(f"Groq API call failed, falling back to Gemini: {str(groq_error)}")
            
            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=502,
                    detail=f"Groq failed ({str(groq_error)}) and Gemini API key is not configured."
                )
                
            from services.gemini import call_gemini_api
            gemini_prompt = f"System Rules:\n{system_prompt}\n\nResume Text to Parse:\n{raw_text}"
            try:
                ai_result = await call_gemini_api(prompt=gemini_prompt, json_mode=True)
            except Exception as gemini_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"Both LLM providers failed. Groq error: {str(groq_error)}. Gemini error: {str(gemini_error)}"
                )

        # 4. Clean and parse AI response
        
        # Remove markdown backticks if present
        if ai_result.startswith("```json"):
            ai_result = ai_result.replace("```json", "").replace("```", "").strip()
        elif ai_result.startswith("```"):
            ai_result = ai_result.replace("```", "").strip()
            
        parsed_json = json.loads(ai_result)
        
        # 5. Send to Supabase Edge Function for Embedding and DB Insertion
        from services.embeddings import process_and_save_data
        edge_response = await process_and_save_data(
            type="cv",
            data={
                "user_id": current_user_id,
                "name": parsed_json.get("name", "Unknown User"),
                "parsed_data": parsed_json
            }
        )
        
        # Return the CV ID generated by the Edge Function
        cv_id = edge_response.get("id")

        return {
            "status": "success", 
            "extracted_data": parsed_json,
            "cv_id": cv_id
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON structure. Raw Output: {ai_result}")
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        lowered_message = error_message.lower()

        if "invalid api key" in lowered_message or "invalid_api_key" in lowered_message:
            raise HTTPException(status_code=401, detail="Invalid GROQ_API_KEY. Please set a valid key.")

        if "rate limit" in lowered_message:
            raise HTTPException(status_code=429, detail="Groq API rate limit exceeded. Please retry shortly.")

        raise HTTPException(status_code=502, detail=f"Groq request failed: {error_message}")


@router.get("/cv/{cv_id}", response_model=CVData)
async def get_cv(cv_id: str, current_user_id: str = Depends(get_current_user_id)):
    """
    Retrieves the parsed CV data by its database ID. Only the owning user may access it.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        cv_response = supabase.table("cvs").select("parsed_data, user_id").eq("id", cv_id).maybe_single().execute()
        if not cv_response or not cv_response.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        if cv_response.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        return cv_response.data["parsed_data"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch CV: {str(e)}")


@router.put("/cv/{cv_id}", response_model=CVResponse)
async def update_cv(cv_id: str, request_data: CVData, current_user_id: str = Depends(get_current_user_id)):
    """
    Updates the parsed CV data by its database ID and clears the skill gap cache.
    Only the owning user may update it.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        existing = supabase.table("cvs").select("user_id").eq("id", cv_id).maybe_single().execute()
        if not existing or not existing.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        if existing.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        response = supabase.table("cvs").update({
            "parsed_data": request_data.dict(),
            "name": request_data.name,
            "skill_gap_cache": None  # Clear cache since CV details have been edited
        }).eq("id", cv_id).eq("user_id", current_user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        return {
            "status": "success",
            "extracted_data": response.data[0]["parsed_data"],
            "cv_id": cv_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update CV: {str(e)}")


@router.post("/cv/{cv_id}/review", response_model=ResumeReviewResponse)
async def review_resume(cv_id: str, current_user_id: str = Depends(get_current_user_id)):
    """
    Runs a real AI ATS audit on a CV: returns a 0-100 score and specific,
    content-aware improvement suggestions. Not cached -- calls the LLM fresh
    on every request. Only the owning user may run this.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection is not configured.")

    try:
        cv_response = supabase.table("cvs").select("parsed_data, user_id").eq("id", cv_id).maybe_single().execute()
        if not cv_response or not cv_response.data:
            raise HTTPException(status_code=404, detail="CV not found.")

        if cv_response.data.get("user_id") != current_user_id:
            raise HTTPException(status_code=403, detail="You do not have access to this CV.")

        parsed_data = cv_response.data["parsed_data"]

        system_prompt = (
            "You are an expert ATS (Applicant Tracking System) resume auditor and technical recruiter. "
            "Analyze the provided resume JSON data and return a strict JSON evaluation of how well it "
            "would perform against automated ATS parsers and human recruiter screening. "
            "Do not include any conversational text, markdown, or code blocks. Return ONLY the raw JSON.\n\n"
            "Required JSON Structure:\n"
            "{\n"
            "  \"ats_score\": <integer 0-100>,\n"
            "  \"suggestions\": [\n"
            "       {\n"
            "           \"title\": \"Short imperative headline, e.g. 'Quantify Your Impact'\",\n"
            "           \"description\": \"2-3 sentences, specific and actionable, referencing the "
            "candidate's actual resume content -- not generic advice\",\n"
            "           \"category\": \"One of: Content, Keywords, Formatting, Impact, Structure\",\n"
            "           \"priority\": \"High, Medium, or Low\"\n"
            "       }\n"
            "  ]\n"
            "}\n\n"
            "Scoring guide: 90-100 only for resumes with strong quantified achievements, clear structure, "
            "relevant keywords, and no missing standard sections. 70-89 for solid resumes with minor gaps. "
            "Below 70 for resumes missing quantified results, weak/generic summaries, or thin content. "
            "Return between 3 and 6 suggestions, ordered High priority first. Suggestions must reference "
            "specifics from the provided data (project names, job titles, skills) -- do not return "
            "boilerplate advice that could apply to any resume."
        )
        user_prompt = f"Resume Data (JSON):\n{json.dumps(parsed_data)}"

        ai_result_text = ""
        try:
            ai_client = await get_ai_client()
            llm_response = await ai_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            ai_result_text = llm_response.choices[0].message.content.strip()
        except Exception as groq_error:
            import logging
            logging.getLogger(__name__).warning(f"Groq API call failed, falling back to Gemini: {str(groq_error)}")

            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=502,
                    detail=f"Groq failed ({str(groq_error)}) and Gemini API key is not configured."
                )

            from services.gemini import call_gemini_api
            gemini_prompt = f"System Rules:\n{system_prompt}\n\nUser Input:\n{user_prompt}"
            try:
                ai_result_text = await call_gemini_api(prompt=gemini_prompt, json_mode=True)
            except Exception as gemini_error:
                raise HTTPException(
                    status_code=502,
                    detail=f"Both LLM providers failed. Groq error: {str(groq_error)}. Gemini error: {str(gemini_error)}"
                )

        try:
            parsed_json = json.loads(ai_result_text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Analysis failed, please try again")

        ats_score = max(0, min(100, int(parsed_json.get("ats_score", 0))))
        suggestions = parsed_json.get("suggestions", [])

        return {
            "status": "success",
            "cv_id": cv_id,
            "ats_score": ats_score,
            "suggestions": suggestions
        }

    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "rate limit" in error_message.lower():
            raise HTTPException(status_code=429, detail="Groq API rate limit exceeded. Please retry shortly.")
        raise HTTPException(status_code=500, detail=f"Resume review failed: {error_message}")



# ── Resume PDF Export ────────────────────────────────────────────────────────

@router.get("/cv/{cv_id}/export-pdf")
async def export_cv_pdf(
    cv_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Generate and return a PDF resume for the given CV record.
    Uses ReportLab (zero-cost, pure Python) — no external service needed.

    The PDF is returned as an inline attachment so the browser downloads it
    directly when called via a link or fetch().
    """
    import io
    from datetime import datetime
    from fastapi.responses import StreamingResponse

    supabase = get_supabase()
    if not supabase:
        raise HTTPException(503, "Database not configured")

    # ── 1. Fetch CV data ──────────────────────────────────────────────────
    try:
        resp = (
            supabase.table("cvs")
            .select("*")
            .eq("id", cv_id)
            .eq("user_id", user_id)
            .maybeSingle()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(500, f"DB fetch failed: {exc}")

    if not resp.data:
        raise HTTPException(404, "CV not found or access denied")

    cv_row = resp.data
    parsed: dict = cv_row.get("parsed_data") or {}

    # ── 2. Build PDF with ReportLab ───────────────────────────────────────
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            HRFlowable,
            ListFlowable,
            ListItem,
        )
        from reportlab.lib.enums import TA_LEFT, TA_CENTER

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
        )

        # ── Styles ─────────────────────────────────────────────────────
        base = getSampleStyleSheet()
        accent = colors.HexColor("#2563EB")   # blue-600

        name_style = ParagraphStyle(
            "Name",
            parent=base["Normal"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0F172A"),
            fontName="Helvetica-Bold",
            alignment=TA_CENTER,
        )
        contact_style = ParagraphStyle(
            "Contact",
            parent=base["Normal"],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#475569"),
            alignment=TA_CENTER,
        )
        section_style = ParagraphStyle(
            "Section",
            parent=base["Normal"],
            fontSize=9,
            leading=12,
            textColor=accent,
            fontName="Helvetica-Bold",
            spaceBefore=8,
            spaceAfter=2,
        )
        body_style = ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=8,
            leading=12,
            textColor=colors.HexColor("#1E293B"),
        )
        sub_style = ParagraphStyle(
            "Sub",
            parent=base["Normal"],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748B"),
        )
        bold_body = ParagraphStyle(
            "BoldBody",
            parent=body_style,
            fontName="Helvetica-Bold",
        )

        def divider():
            return HRFlowable(
                width="100%",
                thickness=0.5,
                color=colors.HexColor("#CBD5E1"),
                spaceAfter=4,
                spaceBefore=2,
            )

        def section(title: str):
            return [Paragraph(title.upper(), section_style), divider()]

        story = []

        # ── Name + Contact ─────────────────────────────────────────────
        name = parsed.get("name") or cv_row.get("name") or "Candidate"
        story.append(Paragraph(name, name_style))
        story.append(Spacer(1, 3))

        contact_parts = []
        if parsed.get("email") or cv_row.get("email"):
            contact_parts.append(parsed.get("email") or cv_row.get("email"))
        if parsed.get("phone"):
            contact_parts.append(parsed["phone"])
        if parsed.get("location"):
            contact_parts.append(parsed["location"])
        if parsed.get("linkedin"):
            contact_parts.append(parsed["linkedin"])
        if parsed.get("github"):
            contact_parts.append(parsed["github"])

        if contact_parts:
            story.append(Paragraph("  ·  ".join(contact_parts), contact_style))

        story.append(Spacer(1, 6))

        # ── Summary ────────────────────────────────────────────────────
        summary = parsed.get("summary", "")
        if summary:
            story += section("Professional Summary")
            story.append(Paragraph(summary, body_style))
            story.append(Spacer(1, 4))

        # ── Skills ─────────────────────────────────────────────────────
        skills_raw = parsed.get("skills", [])
        sb = parsed.get("skills_breakdown") or {}
        all_skills = (
            (sb.get("languages") or [])
            + (sb.get("frameworks") or [])
            + (sb.get("databases") or [])
            + (sb.get("ml_domain") or [])
        ) or skills_raw

        if all_skills:
            story += section("Technical Skills")
            story.append(Paragraph(", ".join(str(s) for s in all_skills), body_style))
            story.append(Spacer(1, 4))

        # ── Experience ─────────────────────────────────────────────────
        experience = parsed.get("experience_details") or []
        if experience:
            story += section("Experience")
            for exp in experience:
                title_line = f"<b>{exp.get('title', '')}</b>  —  {exp.get('company', '')}"
                if exp.get("dates"):
                    title_line += f"  <font color='#94A3B8'>({exp['dates']})</font>"
                story.append(Paragraph(title_line, bold_body))
                if exp.get("location"):
                    story.append(Paragraph(exp["location"], sub_style))
                points = exp.get("points") or []
                if isinstance(points, str):
                    points = [p.strip() for p in points.split("\n") if p.strip()]
                if points:
                    items = [ListItem(Paragraph(p, body_style), leftIndent=10) for p in points]
                    story.append(ListFlowable(items, bulletType="bullet", start="•", leftIndent=10))
                story.append(Spacer(1, 4))

        # ── Education ──────────────────────────────────────────────────
        education = parsed.get("education") or []
        if education:
            story += section("Education")
            for edu in education:
                degree = edu.get("degree", "")
                institution = edu.get("institution", "")
                dates = edu.get("dates", "")
                line = f"<b>{degree}</b>  —  {institution}"
                if dates:
                    line += f"  <font color='#94A3B8'>({dates})</font>"
                story.append(Paragraph(line, bold_body))
                if edu.get("highlights"):
                    story.append(Paragraph(str(edu["highlights"]), sub_style))
                story.append(Spacer(1, 3))

        # ── Projects ───────────────────────────────────────────────────
        projects = parsed.get("projects") or []
        if projects:
            story += section("Projects")
            for proj in projects:
                title_line = f"<b>{proj.get('title', '')}</b>"
                tech = proj.get("tech_stack")
                if tech:
                    if isinstance(tech, list):
                        tech = ", ".join(tech)
                    title_line += f"  <font color='#94A3B8'>({tech})</font>"
                story.append(Paragraph(title_line, bold_body))
                points = proj.get("points") or []
                if isinstance(points, str):
                    points = [p.strip() for p in points.split("\n") if p.strip()]
                if points:
                    items = [ListItem(Paragraph(p, body_style), leftIndent=10) for p in points]
                    story.append(ListFlowable(items, bulletType="bullet", start="•", leftIndent=10))
                story.append(Spacer(1, 3))

        # ── Certifications ─────────────────────────────────────────────
        certs = parsed.get("certifications") or []
        if certs:
            story += section("Certifications")
            for cert in certs:
                title = cert.get("title") or str(cert)
                issuer = cert.get("issuer", "")
                line = f"<b>{title}</b>"
                if issuer:
                    line += f"  —  {issuer}"
                story.append(Paragraph(line, body_style))
            story.append(Spacer(1, 4))

        # ── Footer ─────────────────────────────────────────────────────
        story.append(Spacer(1, 8))
        story.append(divider())
        story.append(
            Paragraph(
                f"Generated by CareerPath AI · {datetime.utcnow().strftime('%B %d, %Y')}",
                ParagraphStyle(
                    "Footer",
                    parent=base["Normal"],
                    fontSize=7,
                    textColor=colors.HexColor("#94A3B8"),
                    alignment=TA_CENTER,
                ),
            )
        )

        doc.build(story)
        buffer.seek(0)

        safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in name).strip() or "resume"
        filename = f"{safe_name}_resume.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except ImportError:
        raise HTTPException(
            501,
            "PDF export requires reportlab. Install with: pip install reportlab",
        )
    except Exception as exc:
        raise HTTPException(500, f"PDF generation failed: {exc}")
