# Truth Tutor Dockerfile

FROM node:22-alpine

# Install dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev --ignore-scripts

# Copy source code
COPY . .

# Expose web server port
EXPOSE 3474

# Environment variables (can be overridden)
ENV TRUTH_TUTOR_HOST=0.0.0.0
ENV TRUTH_TUTOR_PORT=3474

# Default command - start web UI
CMD ["node", "bin/truth-tutor.mjs", "web"]

# Alternative commands:
# Run CLI: docker run -it --rm -e OPENAI_API_KEY=your_key truth-tutor paper-ask --input /app/examples/paper-reading.json
# Build prompts: docker run -it --rm truth-tutor prompt --topic "Test" --confusion "Test"
