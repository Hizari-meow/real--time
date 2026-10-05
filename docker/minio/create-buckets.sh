#!/bin/sh
set -e

echo "Waiting for MinIO server to be available at http://minio:9000..."
until /usr/bin/mc alias set myminio http://minio:9000 minioadmin minioadminpassword; do
  echo "MinIO is not ready yet. Retrying in 1 second..."
  sleep 1
done

echo "Checking if bucket 'document-snapshots' exists..."
if ! /usr/bin/mc ls myminio/document-snapshots > /dev/null 2>&1; then
  echo "Creating bucket 'document-snapshots'..."
  /usr/bin/mc mb myminio/document-snapshots
  echo "Bucket 'document-snapshots' created successfully."
else
  echo "Bucket 'document-snapshots' already exists."
fi

echo "MinIO bucket initialization completed successfully."
exit 0
