# Bet365 Crawler

## Set up on the new PC

### Install the needed tools and dependencies
1. `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
2. `iex "& {$(irm get.scoop.sh)} -RunAsAdmin"`
3. `scoop install git`
4. `scoop install nodejs`
5. Go to disk C:\\
5. `mkdir projects`
6. `cd projects`
7. `git clone https://github.com/blissfulalmeida/radio-shop.git`
8. Install VSCode from browser
9. Open VSCode and open radio-shop
10. `npm install`
11. `npx cross-env NODE_ENV=PROFILE_NAME node .\src\index.js`

## How to launch

1. Copy the `google-sa.json` file to the root of the project
