FROM public.ecr.aws/lambda/python:3.11

# Install ffmpeg, dependencies, and SSL/CA certificates
RUN yum install -y wget tar xz ca-certificates && \
    wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xf ffmpeg-release-amd64-static.tar.xz && \
    mv ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ && \
    mv ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ && \
    chmod +x /usr/local/bin/ffmpeg && \
    chmod +x /usr/local/bin/ffprobe && \
    rm -rf ffmpeg-* && \
    update-ca-trust && \
    yum clean all

# Verify ffmpeg installation
RUN ffmpeg -version && ffprobe -version

# Copy requirements and install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy Lambda function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}/
COPY utils.py ${LAMBDA_TASK_ROOT}/
COPY stages/ ${LAMBDA_TASK_ROOT}/stages/

# Set the CMD to your handler
CMD ["lambda_handler.lambda_handler"]

