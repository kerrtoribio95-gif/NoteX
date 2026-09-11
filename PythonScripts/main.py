import os
import tempfile

import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from PIL import Image
from transformers import pipeline


app = FastAPI(
    title="Document AI API",
    description="Document Question Answering using impira/layoutlm-document-qa",
    version="1.0"
)


# ---------------------------------------------------------
# LOAD MODEL
# ---------------------------------------------------------

print("Loading Hugging Face model...")

document_qa = pipeline(
    "document-question-answering",
    model="impira/layoutlm-document-qa"
)

print("Model loaded successfully!")


# ---------------------------------------------------------
# PDF -> PIL IMAGES
# ---------------------------------------------------------

def pdf_to_images(pdf_path: str):
    """
    Convert every page of a PDF into a PIL RGB image.
    """

    pdf_document = fitz.open(pdf_path)

    images = []

    for page_number in range(len(pdf_document)):

        page = pdf_document.load_page(page_number)

        # Higher resolution helps OCR
        matrix = fitz.Matrix(2, 2)

        pix = page.get_pixmap(
            matrix=matrix,
            alpha=False
        )

        image = Image.frombytes(
            "RGB",
            [pix.width, pix.height],
            pix.samples
        )

        images.append(image)

    pdf_document.close()

    return images


# ---------------------------------------------------------
# RUN DOCUMENT QA
# ---------------------------------------------------------

def ask_document(image: Image.Image, question: str):

    result = document_qa(
        image=image,
        question=question
    )

    # Pipeline normally returns a list
    if isinstance(result, list):

        if len(result) == 0:
            return None

        result = result[0]

    return {
        "answer": result.get("answer", ""),
        "score": float(result.get("score", 0)),
        "start": result.get("start"),
        "end": result.get("end")
    }


# ---------------------------------------------------------
# HOME
# ---------------------------------------------------------

@app.get("/")
def home():

    return {
        "status": "running",
        "model": "impira/layoutlm-document-qa",
        "endpoint": "/ask-document"
    }


# ---------------------------------------------------------
# DOCUMENT UPLOAD + QUESTION
# ---------------------------------------------------------

@app.post("/ask-document")
async def ask_uploaded_document(
    question: str = Form(...),
    file: UploadFile = File(...)
):

    if not question.strip():

        raise HTTPException(
            status_code=400,
            detail="Question is required."
        )

    filename = file.filename or "document"

    extension = os.path.splitext(filename)[1].lower()

    allowed_extensions = [
        ".pdf",
        ".png",
        ".jpg",
        ".jpeg"
    ]

    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Supported: PDF, PNG, JPG, JPEG."
            )
        )

    temp_path = None

    try:

        # -------------------------------------------------
        # Save uploaded file temporarily
        # -------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_file:

            contents = await file.read()

            temp_file.write(contents)

            temp_path = temp_file.name


        # -------------------------------------------------
        # PDF
        # -------------------------------------------------

        if extension == ".pdf":

            images = pdf_to_images(temp_path)

        # -------------------------------------------------
        # IMAGE
        # -------------------------------------------------

        else:

            image = Image.open(temp_path).convert("RGB")

            images = [image]


        if len(images) == 0:

            raise HTTPException(
                status_code=400,
                detail="The document contains no readable pages."
            )


        # -------------------------------------------------
        # Check every page
        # -------------------------------------------------

        page_results = []

        for page_number, image in enumerate(images, start=1):

            try:

                result = ask_document(
                    image,
                    question
                )

                if result:

                    page_results.append({
                        "page": page_number,
                        **result
                    })

            except Exception as page_error:

                print(
                    f"Error processing page {page_number}:",
                    page_error
                )


        if len(page_results) == 0:

            return {
                "success": False,
                "filename": filename,
                "question": question,
                "message": "No answer could be extracted."
            }


        # -------------------------------------------------
        # Select answer with highest confidence
        # -------------------------------------------------

        best_result = max(
            page_results,
            key=lambda x: x["score"]
        )


        return {
            "success": True,
            "filename": filename,
            "question": question,

            "answer": best_result["answer"],
            "confidence": round(
                best_result["score"],
                4
            ),

            "page": best_result["page"],

            "pages_processed": len(images)
        }


    except HTTPException:
        raise

    except Exception as error:

        print(error)

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:

        if temp_path and os.path.exists(temp_path):

            os.remove(temp_path)