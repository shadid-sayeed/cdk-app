# Use the official AWS Lambda Node.js 20 base image
FROM public.ecr.aws/lambda/nodejs:20

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# This step is necessary for Lambda runtime
RUN npm install @aws-sdk/client-s3 sharp

# Copy the rest of your application code (optional)
# COPY . .

# Command to keep the container running (optional for debugging)
CMD ["tail", "-f", "/dev/null"]