# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /code

# Copy the requirements file and install dependencies
# This is done first to leverage Docker's layer caching
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the backend application code
COPY . /code/

# Command to run the application using uvicorn
# 0.0.0.0 makes it accessible from other containers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]