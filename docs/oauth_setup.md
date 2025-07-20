# Outlook OAuth Setup Guide

This guide walks you through setting up OAuth authentication for Outlook email integration in Echo.

## Prerequisites

- Microsoft account (personal or work)
- Access to Azure Portal (for app registration)

## .edu Account Considerations

If you're using a `.edu` email address, you need to determine your account type:

### Account Type Diagnostic
Run this command to check your account type:
```bash
echo email_account_check
```

### Personal Microsoft Account (.edu)
- ✅ **Works with standard OAuth**
- You sign in with your .edu email
- You manage your own permissions
- No admin approval needed
- Use "Personal Microsoft accounts only" in app registration

### Work/School Account (Azure AD)
- ⚠️ **May require admin approval**
- Managed by your school's IT department
- May need to contact IT for app approval
- Uses school's tenant ID instead of "common"
- May have restricted permissions

### Quick Test
Try signing in to [portal.azure.com](https://portal.azure.com) with your .edu account:
- **If you can access Azure Portal**: Personal account (should work)
- **If you get access denied**: Work/school account (may need IT approval)

## Step 1: Register Azure Application

### 1.1 Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your Microsoft account

### 1.2 Create App Registration
1. Navigate to **Azure Active Directory** → **App registrations**
2. Click **New registration**
3. Fill in the details:
   - **Name**: `Echo Email Integration`
   - **Supported account types**: `Personal Microsoft accounts only`
   - **Redirect URI**: `http://localhost:8080/auth/callback`
   - **Platform configuration**: Web
4. Click **Register**

### 1.3 Note Application Details
After registration, note down:
- **Application (client) ID** - You'll need this for configuration
- **Directory (tenant) ID** - Usually `common` for personal accounts

## Step 2: Configure API Permissions

### 2.1 Add Mail Permissions
1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `Mail.Read` - Read user mail
   - `Mail.ReadWrite` - Read and write user mail
   - `User.Read` - Read user profile
6. Click **Add permissions**

### 2.2 Grant Admin Consent
1. Click **Grant admin consent for [Your Name]**
2. Confirm the permissions

## Step 3: Create Client Secret

### 3.1 Generate Secret
1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `Echo Email Integration Secret`
4. Choose expiration: `24 months` (recommended)
5. Click **Add**

### 3.2 Copy Secret Value
**IMPORTANT**: Copy the secret value immediately - you won't be able to see it again!

## Step 4: Configure Echo

### 4.1 Update Configuration File
Edit `config/user_config.yaml`:

```yaml
email:
  oauth:
    client_id: "your-client-id-here"
    client_secret: "your-client-secret-here"
    redirect_uri: "http://localhost:8080/auth/callback"
    scopes:
      - "Mail.Read"
      - "Mail.ReadWrite"
      - "User.Read"
  
  # Email processing settings
  important_senders:
    - "ceo@company.com"
    - "manager@company.com"
    - "client@company.com"
  
  urgent_keywords:
    - "urgent"
    - "asap"
    - "deadline"
    - "important"
    - "critical"
  
  action_keywords:
    - "please"
    - "can you"
    - "need"
    - "review"
    - "send"
    - "schedule"
    - "meeting"
```

### 4.2 Replace Placeholders
- Replace `your-client-id-here` with your Application (client) ID
- Replace `your-client-secret-here` with your client secret value
- Update `important_senders` with actual email addresses you want to prioritize

## Step 5: Test OAuth Flow

### 5.1 Run OAuth Test
```bash
# Test OAuth configuration
python -m echo.cli email_oauth_test
```

### 5.2 Complete Authorization
1. The command will open your browser to Microsoft's authorization page
2. Sign in with your Microsoft account
3. Grant permissions to Echo
4. You'll be redirected to `http://localhost:8080/auth/callback`
5. Copy the authorization code from the URL
6. Paste it back into the terminal

### 5.3 Verify Integration
```bash
# Test email summary
echo email_summary

# Test action extraction
echo email_process
```

## Troubleshooting

### Common Issues

#### 1. "Invalid client" Error
- Verify your client ID is correct
- Ensure the app registration is complete
- Check that you're using the right tenant ID

#### 2. "Invalid redirect URI" Error
- Verify the redirect URI matches exactly: `http://localhost:8080/auth/callback`
- Check for extra spaces or typos

#### 3. "Insufficient permissions" Error
- Ensure all required permissions are granted
- Try granting admin consent again
- Check that the app registration is active

#### 4. "Token expired" Error
- The system will automatically refresh tokens
- If persistent, regenerate the client secret

### .edu Account Specific Issues

#### 1. "Admin consent required" Error
**Cause**: Your school's IT department controls app permissions
**Solution**:
- Contact your school's IT department
- Request admin consent for the app
- Provide them with your app's client ID
- Ask them to whitelist the app

#### 2. "Access denied" when registering app
**Cause**: Your .edu account is a work/school account
**Solution**:
- Use a personal Microsoft account instead
- Or contact IT to register the app in your school's Azure AD
- Or use IMAP/POP3 instead of Graph API

#### 3. "Invalid tenant" Error
**Cause**: Using wrong tenant ID for work/school account
**Solution**:
- Get your school's tenant ID from IT
- Update configuration with correct tenant ID
- Use `https://login.microsoftonline.com/{tenant-id}` instead of `common`

#### 4. "Permission denied" for certain scopes
**Cause**: School restricts certain permissions
**Solution**:
- Request IT to enable the required permissions
- Use alternative authentication method (IMAP/POP3)
- Limit app to read-only permissions only

### Alternative Solutions for .edu Accounts

If OAuth doesn't work with your .edu account:

#### Option 1: Use Personal Microsoft Account
- Create a personal Microsoft account
- Forward important emails to personal account
- Use personal account for Echo integration

#### Option 2: IMAP/POP3 Integration
- Use traditional email protocols
- Less secure but more compatible
- Works with most email providers

#### Option 3: Request IT Approval
- Contact your school's IT department
- Explain the app's purpose and security
- Request admin consent for the app

### Security Best Practices

1. **Store Secrets Securely**
   - Never commit client secrets to version control
   - Use environment variables for production
   - Rotate secrets regularly

2. **Limit Permissions**
   - Only request necessary permissions
   - Review and remove unused permissions

3. **Monitor Usage**
   - Check Azure Portal for usage statistics
   - Monitor for unusual activity

## Advanced Configuration

### Custom Redirect URI
If you need a different redirect URI:

1. Update in Azure Portal app registration
2. Update in Echo configuration
3. Ensure both match exactly

### Multiple Accounts
To support multiple Microsoft accounts:

1. Create separate app registrations
2. Use different client IDs for each account
3. Configure separate email sections in config

### Production Deployment
For production use:

1. Use HTTPS redirect URIs
2. Store secrets in environment variables
3. Implement proper token storage
4. Add error handling and logging

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify all configuration values
3. Test with a simple email summary first
4. Check Azure Portal for app registration status

## Next Steps

Once OAuth is working:

1. **Test email processing**: `echo email_summary`
2. **Extract action items**: `echo email_process`
3. **Track responses**: Monitor response status in summaries
4. **Integrate with workflows**: Use in morning check-in and end-of-day

The email integration will then provide:
- Daily email summaries with response tracking
- Action item extraction and prioritization
- Integration with your daily planning workflow
- Persistent tracking of email tasks 