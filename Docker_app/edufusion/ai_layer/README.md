The Docker Compose AI service runs Ollama locally and downloads the configured
model (`llama3.2:1b` by default) on first startup. The model stays in the
`ollama_data` Docker volume and is used by the backend for local summarization.
The first startup requires internet access to download the model; summaries are
then generated locally.
