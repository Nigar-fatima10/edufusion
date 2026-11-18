#!/bin/sh
set -eu

MODEL="${OLLAMA_MODEL:-llama3.2:1b}"

ollama serve &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' INT TERM

until ollama list >/dev/null 2>&1; do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    wait "$server_pid"
    exit 1
  fi
  sleep 2
done

ollama pull "$MODEL"
wait "$server_pid"
