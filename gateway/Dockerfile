FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y openjdk-17-jre-headless unzip curl && \
    apt-get clean
WORKDIR /app/gateway
RUN curl -O https://download2.interactivebrokers.com/portal/clientportal.gw.zip && \
    unzip clientportal.gw.zip && rm clientportal.gw.zip && \
    chmod +x bin/run.sh
RUN keytool -genkey -keyalg RSA -alias selfsigned -keystore root/cacert.jks \
    -storepass mywebapi -validity 730 -keysize 2048 -dname "CN=localhost"
# Copy the config file to the root directory where the gateway expects it
COPY gateway/conf.yaml /app/gateway/root/conf.yaml