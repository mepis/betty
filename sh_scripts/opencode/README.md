You are on your on. The install script is customized for a specific device, though it is very easy to update for your machine.

1. Update the opencode.json file.
   -- Add/remove providers as needed. If the install_local_laptop.sh script was run, remove the 'Merlin' and 'Betty providers' (Merlin is optional, Betty is not).
   -- Update the hostname to this machine's IP.
   -- Update the 'Local' provider IP to this machine's IP.
2. Update Searxng
   2A. If you did not install SearxNG, delete the tools folder before running this script.
   2B. If SearxNG was installed, update the SEARXNG_URL value in search.js.
