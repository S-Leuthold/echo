# Token Management Guide

## Overview

Echo uses Microsoft Graph API for email integration, which requires OAuth authentication. This guide explains how to manage tokens and enable automatic refresh functionality.

## Token Types

### Access Token
- **Lifetime**: ~1 hour (3600 seconds)
- **Purpose**: Used to make API requests to Microsoft Graph
- **Storage**: Stored in `.token` file

### Refresh Token
- **Lifetime**: Up to 90 days (depends on Microsoft's policy)
- **Purpose**: Used to get new access tokens without re-authentication
- **Storage**: Stored in `.token` file alongside access token

## Current Token Status

Your current token **does not have refresh capability**, which means:
- ✅ You can use email features for ~1 hour
- ❌ You need to manually re-authenticate every hour
- ❌ No automatic token refresh

## Commands

### Check Token Status
```bash
python -m echo.cli check-token-status
```
Shows:
- Token availability
- Expiration time
- Refresh token availability
- API connectivity test

### Force Re-authentication (Recommended)
```bash
python -m echo.cli force-reauth
```
This will:
1. Remove the old token file
2. Start OAuth login with `offline_access` scope
3. Get a refresh token for automatic renewal

### Manual Token Refresh
```bash
python -m echo.cli refresh-token
```
Manually refresh the access token (only works if you have a refresh token)

### OAuth Login
```bash
python -m echo.cli oauth-login
```
Standard OAuth login (use `force-reauth` instead for refresh token support)

## Automatic Token Refresh

Once you have a refresh token, Echo will automatically:
- ✅ Check token expiration before API calls
- ✅ Refresh tokens when they're about to expire (within 5 minutes)
- ✅ Retry failed requests after token refresh
- ✅ Handle token expiration gracefully

## Why Tokens Expire

Microsoft's security policy requires short-lived access tokens:
- **Access tokens**: 1 hour (prevents long-term unauthorized access)
- **Refresh tokens**: 90 days (allows convenient renewal)

This is standard OAuth 2.0 security practice.

## Troubleshooting

### "Token expired" errors
1. Run `python -m echo.cli check-token-status`
2. If no refresh token: Run `python -m echo.cli force-reauth`
3. If refresh token exists: Run `python -m echo.cli refresh-token`

### "No valid access token" errors
1. Run `python -m echo.cli oauth-login`
2. Or run `python -m echo.cli force-reauth` for refresh token support

### API calls failing
1. Check token status: `python -m echo.cli check-token-status`
2. Test API connectivity in the status check
3. Re-authenticate if needed

## Security Notes

- Tokens are stored locally in `.token` file
- Refresh tokens have longer lifetimes but are more sensitive
- Never share your `.token` file
- The file is already in `.gitignore` to prevent accidental commits

## Next Steps

1. **Run**: `python -m echo.cli force-reauth`
2. **Complete**: OAuth login in your browser
3. **Verify**: `python -m echo.cli check-token-status`
4. **Enjoy**: Automatic token refresh for the next 90 days!

## Environment Variables Required

Make sure these are set in your `.env` file:
```
ECHO_GRAPH_CLIENT_ID=your_client_id
ECHO_GRAPH_CLIENT_SECRET=your_client_secret
ECHO_GRAPH_REDIRECT_URI=http://localhost:8080/auth/callback
``` 