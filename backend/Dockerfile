FROM python:3.11-slim

WORKDIR /app

# Install poetry
RUN pip install poetry

# Copy configuration first for caching
COPY pyproject.toml poetry.lock* /app/

# Install dependencies (no interaction, no root user needed inside container usually, but keeping simple for now)
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# Copy application code
COPY . /app

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
