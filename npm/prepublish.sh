#!/bin/bash
# exit on error
cd ..
make release-client
cp ./bin/ngrok ./npm/bin/to-littlein