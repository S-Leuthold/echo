# IMAP Email Integration Setup Guide

This guide walks you through setting up IMAP email integration for Echo, which works with **any email provider** (Outlook, Gmail, Yahoo, iCloud, etc.).

## Why IMAP?

✅ **Universal**: Works with any email provider  
✅ **No OAuth Complexity**: Simple username/password authentication  
✅ **Full Response Tracking**: Can read sent items for response detection  
✅ **Immediate Setup**: No admin approval needed  
✅ **Complete Functionality**: All features work as designed  

## Supported Email Providers

| Provider | Server | Port | SSL |
|----------|--------|------|-----|
| **Outlook** | `outlook.office365.com` | 993 | ✅ |
| **Gmail** | `imap.gmail.com` | 993 | ✅ |
| **Yahoo** | `imap.mail.yahoo.com` | 993 | ✅ |
| **iCloud** | `imap.mail.me.com` | 993 | ✅ |
| **Custom** | Your server | 993/143 | ✅/❌ |

## Step 1: Enable IMAP in Your Email Account

### For Outlook (.edu accounts):
1. Go to [Outlook Settings](https://outlook.office.com/mail/options/mail/accounts/pop)
2. Enable IMAP access
3. Generate an app password (recommended for security)

### For Gmail:
1. Go to [Gmail Settings](https://mail.google.com/mail/u/0/#settings/general)
2. Enable IMAP in "Forwarding and POP/IMAP"
3. Generate an app password (required for 2FA accounts)

### For Yahoo:
1. Go to [Yahoo Mail Settings](https://mail.yahoo.com/?.intl=us)
2. Enable IMAP access
3. Generate an app password

### For iCloud:
1. Go to [iCloud Settings](https://www.icloud.com/settings/)
2. Enable IMAP for Mail
3. Generate an app-specific password

## Step 2: Generate App Password (Recommended)

**Why use app passwords?**
- More secure than your main password
- Can be revoked without affecting your main account
- Required for accounts with 2FA enabled

### Outlook App Password:
1. Go to [Microsoft Account Security](https://account.microsoft.com/security)
2. Select "Advanced security options"
3. Generate an app password
4. Use this password in Echo configuration

### Gmail App Password:
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled
3. Generate an app password
4. Use this password in Echo configuration

## Step 3: Configure Echo

### Update Configuration File
Edit `config/user_config.yaml`:

```yaml
email:
  # IMAP Configuration
  imap:
    provider: "outlook"  # or gmail, yahoo, icloud
    server: "outlook.office365.com"  # Auto-filled based on provider
    port: 993
    username: "your-email@university.edu"
    password: "your-app-password"  # Use app password for security
    use_ssl: true
  
  # Email Processing Settings
  important_senders:
    - "ceo@company.com"
    - "manager@company.com"
    - "professor@university.edu"
    - "advisor@university.edu"
  
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

### Provider-Specific Settings

#### Outlook (.edu accounts):
```yaml
imap:
  provider: "outlook"
  server: "outlook.office365.com"
  port: 993
  username: "your-email@university.edu"
  password: "your-app-password"
  use_ssl: true
```

#### Gmail:
```yaml
imap:
  provider: "gmail"
  server: "imap.gmail.com"
  port: 993
  username: "your-email@gmail.com"
  password: "your-app-password"
  use_ssl: true
```

#### Yahoo:
```yaml
imap:
  provider: "yahoo"
  server: "imap.mail.yahoo.com"
  port: 993
  username: "your-email@yahoo.com"
  password: "your-app-password"
  use_ssl: true
```

## Step 4: Test Connection

### Test IMAP Connection
```bash
echo email_test_connection
```

This will:
- ✅ Test connection to your email server
- ✅ Verify INBOX access
- ✅ Check Sent Items folder access
- ✅ Validate your configuration

### Expected Output:
```
🔗 Testing IMAP Connection
=========================
📧 **Configuration:**
  Provider: outlook
  Server: outlook.office365.com
  Port: 993
  Username: your-email@university.edu
  SSL: True

🔗 **Testing Connection...**
✅ Connection successful!
✅ INBOX access successful!
✅ Sent Items access successful!

✅ **Connection Test Passed!**
Your IMAP configuration is working correctly.
```

## Step 5: Test Email Integration

### Test Email Summary
```bash
echo email_summary
```

### Test Action Extraction
```bash
echo email_process
```

### Test Urgent Items
```bash
echo email_urgent
```

## Troubleshooting

### Common Connection Issues

#### 1. "Authentication failed" Error
**Cause**: Wrong username/password
**Solution**:
- Verify your username (usually your full email address)
- Use an app password instead of your main password
- Check if 2FA is enabled (requires app password)

#### 2. "Connection refused" Error
**Cause**: Wrong server/port or IMAP disabled
**Solution**:
- Verify server and port settings
- Enable IMAP in your email account settings
- Check firewall/network restrictions

#### 3. "SSL certificate" Error
**Cause**: SSL/TLS issues
**Solution**:
- Ensure `use_ssl: true` for port 993
- Try `use_ssl: false` for port 143 (less secure)
- Check if your email provider requires SSL

#### 4. "Folder not found" Error
**Cause**: Different folder names
**Solution**:
- Common sent folder names: "Sent Items", "Sent", "Sent Mail"
- The system will try multiple folder names automatically

### Provider-Specific Issues

#### Outlook (.edu accounts):
- **Issue**: "Access denied" for sent items
- **Solution**: Check if your school restricts sent folder access
- **Workaround**: Use personal account or contact IT

#### Gmail:
- **Issue**: "Invalid credentials" with 2FA
- **Solution**: Generate app password specifically for Echo
- **Note**: Regular password won't work with 2FA enabled

#### Yahoo:
- **Issue**: "App password required"
- **Solution**: Generate app password in Yahoo account settings
- **Note**: Regular password may not work for IMAP

### Security Best Practices

1. **Use App Passwords**
   - Generate app-specific passwords
   - Don't use your main account password
   - App passwords can be revoked if needed

2. **Enable SSL/TLS**
   - Always use SSL for IMAP connections
   - Port 993 with SSL is more secure than port 143

3. **Regular Password Updates**
   - Update app passwords periodically
   - Revoke old app passwords when not needed

4. **Monitor Access**
   - Check your email account for unusual access
   - Review app passwords regularly

## Advanced Configuration

### Custom Email Server
If you're using a custom email server:

```yaml
imap:
  provider: "custom"
  server: "mail.yourcompany.com"
  port: 993
  username: "your-email@yourcompany.com"
  password: "your-password"
  use_ssl: true
```

### Multiple Email Accounts
To support multiple email accounts, you can:

1. **Use different configurations** for different accounts
2. **Forward emails** to a single account
3. **Run multiple instances** with different configs

### Folder Customization
The system automatically tries common folder names:
- INBOX (always available)
- Sent Items, Sent, Sent Mail (for sent items)

## Integration with Daily Workflow

Once configured, email integration will:

### Morning Check-in:
- Show email summary with response status
- Highlight urgent emails needing attention
- Display pending action items

### Admin Blocks:
- Process new emails for action items
- Track response status
- Prioritize urgent communications

### End-of-Day:
- Include email status in evening reflection
- Track completed vs. pending responses
- Plan next day's email priorities

## Next Steps

After successful setup:

1. **Test all commands**:
   ```bash
   echo email_summary
   echo email_actions
   echo email_urgent
   echo email_process
   ```

2. **Customize settings**:
   - Add important senders
   - Adjust urgent keywords
   - Fine-tune action keywords

3. **Integrate with workflow**:
   - Use in morning check-in
   - Include in admin blocks
   - Monitor in end-of-day review

4. **Monitor and adjust**:
   - Review email summaries
   - Adjust keyword lists
   - Optimize sender priorities

## Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Verify your email provider settings**
3. **Test with a simple email client** first
4. **Contact your email provider** for IMAP support

The IMAP integration provides universal email support with full response tracking - perfect for managing your email workflow! 🚀 