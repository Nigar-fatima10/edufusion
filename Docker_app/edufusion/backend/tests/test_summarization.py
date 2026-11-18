import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app import main


class SummaryExtractionTests(unittest.TestCase):
    def test_extracts_uploaded_text(self):
        with tempfile.TemporaryDirectory() as directory:
            upload_dir = Path(directory)
            source = upload_dir / "notes.txt"
            source.write_text("A short study note.", encoding="utf-8")
            material = {"storage_path": str(source)}

            with patch.object(main, "UPLOAD_DIR", upload_dir):
                self.assertEqual(main._extract_material_text(material), "A short study note.")

    def test_rejects_audio_without_a_transcript(self):
        with tempfile.TemporaryDirectory() as directory:
            upload_dir = Path(directory)
            source = upload_dir / "lecture.mp3"
            source.write_bytes(b"audio")
            material = {"storage_path": str(source)}

            with patch.object(main, "UPLOAD_DIR", upload_dir):
                with self.assertRaises(HTTPException) as raised:
                    main._extract_material_text(material)

            self.assertEqual(raised.exception.status_code, 422)


class SummaryGenerationTests(unittest.IsolatedAsyncioTestCase):
    async def test_summarizes_selected_material_using_local_model(self):
        with tempfile.TemporaryDirectory() as directory:
            upload_dir = Path(directory)
            source = upload_dir / "notes.txt"
            source.write_text("Important course material.", encoding="utf-8")
            records = {
                "material-1": {
                    "id": "material-1",
                    "name": "notes.txt",
                    "storage_path": str(source),
                }
            }

            with (
                patch.object(main, "UPLOAD_DIR", upload_dir),
                patch.object(main, "materials", records),
                patch.object(main, "_ollama_generate", new=AsyncMock(return_value="A useful summary.")) as model,
            ):
                result = await main.summarize_material(
                    main.SummaryRequest(material_id="material-1", length="short")
                )

            self.assertEqual(result.summary, "A useful summary.")
            self.assertEqual(result.source_name, "notes.txt")
            self.assertEqual(result.route, "local")
            model.assert_awaited_once()

    async def test_splits_long_input_and_combines_partial_summaries(self):
        with patch.object(
            main,
            "_ollama_generate",
            new=AsyncMock(side_effect=["Part one.", "Part two.", "Combined summary."]),
        ) as model:
            result = await main.summarize_material(
                main.SummaryRequest(text=("course content " * 900), length="detailed")
            )

        self.assertEqual(result.summary, "Combined summary.")
        self.assertEqual(model.await_count, 3)
        self.assertIn("Combine these partial summaries", model.await_args.args[0])

    async def test_rejects_unsupported_summary_length(self):
        with self.assertRaises(HTTPException) as raised:
            await main.summarize_material(
                main.SummaryRequest(text="course content", length="unexpected")
            )

        self.assertEqual(raised.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
