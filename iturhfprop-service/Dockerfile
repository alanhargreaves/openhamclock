FROM ubuntu:22.04

# Prevent interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js and utilities
RUN apt-get update && apt-get install -y \
    curl \
    tar \
    unzip \
    ca-certificates \
    findutils \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Create directory for ITURHFProp
WORKDIR /opt/iturhfprop

# Download individual binary files from v14.3 release (latest)
RUN curl -L -o ITURHFProp "https://github.com/ITU-R-Study-Group-3/ITU-R-HF/releases/download/v14.3/ITURHFProp" \
    && curl -L -o libp533.so "https://github.com/ITU-R-Study-Group-3/ITU-R-HF/releases/download/v14.3/libp533.so" \
    && curl -L -o libp372.so "https://github.com/ITU-R-Study-Group-3/ITU-R-HF/releases/download/v14.3/libp372.so" \
    && chmod +x ITURHFProp

# Download source to get Data files from official ITU download
RUN curl -L -o itu-hf.zip "https://www.itu.int/en/ITU-R/study-groups/rsg3/rwp3m/Software%20Products/ITU-R-HF_14.3.zip" \
    && unzip itu-hf.zip \
    && echo "=== Contents of ITU download ===" \
    && ls -la \
    && echo "=== Looking for Data directory ===" \
    && find . -type d -name "Data" \
    && echo "=== Looking for ionos files ===" \
    && find . -name "ionos*.bin" \
    && find . -name "*.ant"

# Copy all data files from ITU download
RUN if [ -d "Data" ]; then echo "Found Data at root"; \
    elif [ -d "ITU-R-HF_14.3/Data" ]; then mv ITU-R-HF_14.3/Data .; \
    elif [ -d "P533/Data" ]; then mv P533/Data .; \
    else find . -type d -name "Data" -exec cp -r {} . \; ; fi \
    && echo "=== Final Data contents ===" && ls -la Data/ | head -20

# Cleanup
RUN rm -rf ITU-R-HF_14.3 itu-hf.zip P533 *.exe *.dll 2>/dev/null || true

# Set library path so ITURHFProp can find shared libs
ENV LD_LIBRARY_PATH=/opt/iturhfprop:$LD_LIBRARY_PATH

# Verify installation - show all files in Data
RUN echo "=== Binary files ===" && ls -la /opt/iturhfprop/*.so /opt/iturhfprop/ITURHFProp \
    && echo "=== Data directory contents ===" && ls -la /opt/iturhfprop/Data/

# Set up the API service
WORKDIR /app
COPY package.json ./
RUN npm install --production

COPY server.js ./

# Environment
ENV PORT=3000
ENV ITURHFPROP_PATH=/opt/iturhfprop/ITURHFProp
ENV ITURHFPROP_DATA=/opt/iturhfprop

EXPOSE 3000

CMD ["node", "server.js"]
