FROM postgres:15

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY docker/db-entrypoint-tls.sh /usr/local/bin/db-entrypoint-tls.sh
COPY docker/pg_hba.conf /etc/postgresql/pg_hba.conf

RUN chmod +x /usr/local/bin/db-entrypoint-tls.sh

ENTRYPOINT ["db-entrypoint-tls.sh"]
CMD ["postgres"]
