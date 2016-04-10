# alt-mds
An alternate implementation of the FIDO Metadata Service (MDS).

The specification for the FIDO MDS can be found here:
https://fidoalliance.org/specs/fido-uaf-v1.0-ps-20141208/fido-uaf-metadata-service-v1.0-ps-20141208.html

And the actual production implementation can be found her:
https://mds.fidoalliance.org

<hr>
## Installation & Setup

`makecerts.sh` equires openssl to be installed.

Run these commands:
```
npm install https://github.com/apowers313/alt-mds.git
makecerts.sh
mkdir database
```

Then drop JSON files with the [FIDO metadata](https://fidoalliance.org/specs/fido-uaf-v1.0-ps-20141208/fido-uaf-authnr-metadata-v1.0-ps-20141208.html) you want to serve into the `database` directory.

You may want to edit the configuration settings at the top of `alt-mds.js`

When you are ready, run `node alt-mds.js`. If you haven't changed the configurations, you should be able to connect to http://localhost:8080/ and download the MDS Table of Contents (TOC). It's just a [JWT](https://tools.ietf.org/html/rfc7519) token, so head over to http://jwt.io and drop the text into that webpage to see what you are getting.

## Caveats
This is not secure. Keys and other sensitive information are not protected. This may lead to tampering or other attacks that may lead to the wrong metadata being served up. All the various checks and verifications that should take place, probably don't, opening up all kinds of other attacks. Don't use this for anything serious without a third-party security audit.

It is not production ready. There is currently insufficient testing, some bugs may exist. Don't use this for anything serious without writing some unit tests and performing some code reviews first.

And it is not a full implementation of a MDS. Some of the metadata values are dummied up. For example, `nextUpdate` and `no` in the TOC are static, as is `statusReports` in each entry. Making these "real" would require a persistent data store and some logic to update them accordingly.