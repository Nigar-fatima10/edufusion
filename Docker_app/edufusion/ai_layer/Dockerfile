FROM ollama/ollama:latest

COPY start-ollama.sh /start-ollama.sh
RUN chmod +x /start-ollama.sh

ENTRYPOINT ["/bin/sh", "/start-ollama.sh"]