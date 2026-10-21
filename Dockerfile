FROM nginx:stable-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY index.html style.css /srv/book-store/
COPY image/ /srv/book-store/image/

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ && wget -q -O /dev/null http://127.0.0.1:8080/style.css || exit 1
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
