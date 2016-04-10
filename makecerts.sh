# Create directories and generic files
mkdir -p ca/root/private ca/root/crl ca/root/certs ca/root/newcerts
mkdir -p ca/intermediate/private ca/intermediate/crl ca/intermediate/certs ca/intermediate/csr
chmod 700 ca/root/private ca/intermediate/private
echo 1000 > ca/intermediate/crlnumber
touch ca/root/index.txt
echo 1000 > ca/root/serial

# Create keys
openssl ecparam -name secp256r1 -genkey -param_enc explicit -out ca/root/private/ca.key.pem
openssl ecparam -name secp256r1 -genkey -param_enc explicit -out ca/intermediate/private/intermediate.key.pem
openssl ec -in ca/intermediate/private/intermediate.key.pem -noout -text > ca/intermediate/private/intermediate.key.txt
chmod 400 ca/root/private/ca.key.pem ca/intermediate/private/intermediate.key.pem ca/intermediate/private/intermediate.key.txt

# Create root cert
openssl req -config ca/root/openssl.cnf -key ca/root/private/ca.key.pem -new -x509 -days 7300 -sha256 -extensions v3_ca -out ca/root/certs/ca.cert.pem
chmod 444 ca/root/certs/ca.cert.pem
openssl x509 -noout -text -in ca/root/certs/ca.cert.pem

# Create intemediate cert
openssl req -config ca/intermediate/openssl.cnf -new -sha256 -key ca/intermediate/private/intermediate.key.pem  -out ca/intermediate/csr/intermediate.csr.pem
openssl ca -config ca/root/openssl.cnf -extensions v3_intermediate_ca -days 3650 -notext -md sha256 -in ca/intermediate/csr/intermediate.csr.pem -out ca/intermediate/certs/intermediate.cert.pem
openssl x509 -noout -text -in ca/intermediate/certs/intermediate.cert.pem
openssl verify -CAfile ca/root/certs/ca.cert.pem ca/intermediate/certs/intermediate.cert.pem
cat ca/intermediate/certs/intermediate.cert.pem ca/root/certs/ca.cert.pem > ca/intermediate/certs/ca-chain.cert.pem
chmod 444 ca/intermediate/certs/ca-chain.cert.pem