-- Seed Knowledge Base Articles for Prompt & Pause RDS
-- All articles reference PDSdesk portal for ticket/support links

-- Get a system user ID for created_by (use first global_admin or create placeholder)
DO $$
DECLARE
  v_author_id uuid;
BEGIN
  -- Try to get a global_admin user
  SELECT user_id INTO v_author_id 
  FROM public.user_roles 
  WHERE role = 'global_admin' 
  LIMIT 1;
  
  -- If no admin found, use a placeholder UUID
  IF v_author_id IS NULL THEN
    v_author_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- ============================================
  -- CATEGORY 1: ONBOARDING
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'welcome-first-day',
    'Welcome to Prompt & Pause - Your First Day',
    '# Welcome to Prompt & Pause

Welcome to the team! This guide will help you get started on your first day.

## What You''ll Receive
- **Email:** yourname@promptandpause.com
- **RDP Access:** Login credentials for remote desktop
- **Microsoft 365:** Office apps, OneDrive, Teams

## First Steps
1. **Log in to RDS** using your credentials
2. **Check your email** in Outlook (opens automatically)
3. **Review company policies** in the HR folder
4. **Set up your OneDrive** (syncs automatically)

## Need Help?
Contact our IT Service Desk:
- **Email:** servicedesk@promptandpause.com
- **Portal:** Submit a ticket through PDSdesk

Your manager will schedule your onboarding sessions. Welcome aboard!',
    'Onboarding',
    'published',
    ARRAY['welcome', 'first day', 'new employee', 'getting started'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'getting-started-rds',
    'Getting Started with Remote Desktop (RDS)',
    '# Getting Started with Remote Desktop (RDS)

## What is RDS?
Remote Desktop Services lets you access your work computer from anywhere.

## How to Connect

### From Windows:
1. Press **Windows Key + R**
2. Type: `mstsc`
3. Enter: `rds01.promptandpause.com`
4. Username: `PROMPTANDPAUSE\yourname` or `yourname@promptandpause.com`
5. Password: Your company password

### From Mac:
1. Download **Microsoft Remote Desktop** from App Store
2. Click **Add PC**
3. PC name: `rds01.promptandpause.com`
4. User account: Add your credentials
5. Click **Connect**

### From Mobile (iOS/Android):
1. Download **Microsoft Remote Desktop** app
2. Tap **+** → **Add PC**
3. PC name: `rds01.promptandpause.com`
4. Add credentials
5. Tap to connect

## First Login
When you log in for the first time:
- Your desktop will load (may take 30-60 seconds)
- OneDrive will start syncing automatically
- Office apps are ready to use
- Your email will be configured in Outlook

## Tips
- **Save your connection** for easy access next time
- **Use full screen mode** for best experience
- **Your files auto-save** to OneDrive

**Questions?** Submit a ticket through PDSdesk or email servicedesk@promptandpause.com',
    'Onboarding',
    'published',
    ARRAY['rds', 'remote desktop', 'connection', 'login', 'access'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- CATEGORY 2: IT SUPPORT
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'common-rds-issues',
    'Common RDS Issues & Solutions',
    '# Common RDS Issues & Solutions

## Cannot Connect to Remote Desktop

### Solution 1: Check Your Internet
- Ensure you have stable internet connection
- Try: `ping rds01.promptandpause.com` in Command Prompt

### Solution 2: Verify Credentials
- Username format: `PROMPTANDPAUSE\yourname` or `yourname@promptandpause.com`
- Password is case-sensitive
- If forgotten, submit a password reset ticket through PDSdesk

### Solution 3: Check VPN (if required)
- Ensure VPN is connected before RDP
- Contact IT if you don''t have VPN credentials

## Slow Performance

### Quick Fixes:
1. **Close unused applications** - Right-click taskbar, close apps you''re not using
2. **Clear browser cache** - Edge → Settings → Privacy → Clear browsing data
3. **Restart your session** - Sign out and sign back in
4. **Check your internet speed** - Minimum 10 Mbps recommended

## Screen is Black After Login

**Solution:**
1. Press **Ctrl + Alt + End** (equivalent of Ctrl+Alt+Del on RDP)
2. Click **Task Manager**
3. File → Run new task
4. Type: `explorer.exe`
5. Click **OK**

If problem persists, submit a ticket through PDSdesk.

## OneDrive Not Syncing

**Solution:**
1. Right-click **OneDrive** icon (system tray)
2. Click **Settings**
3. Click **Account** tab
4. Click **Unlink this PC**
5. Sign out of RDS and sign back in
6. OneDrive will reconfigure automatically

**Still stuck?** Submit a ticket through PDSdesk for assistance.',
    'IT Support',
    'published',
    ARRAY['rds', 'troubleshooting', 'connection', 'performance', 'onedrive'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'contacting-it-support',
    'How to Contact IT Support',
    '# How to Contact IT Support

## PDSdesk Service Portal
- **Portal:** Access PDSdesk from your browser
- **Email:** servicedesk@promptandpause.com
- **Response Time:** Within 4 business hours

## What to Include in Your Ticket
1. **Your name and email**
2. **What you were trying to do**
3. **What happened instead**
4. **Screenshots** (if applicable)
5. **Error messages** (exact wording)

## Priority Levels

### Urgent (2 hour response)
- Cannot access RDS at all
- Email completely down
- Security incident
- Data loss

### Normal (4 hour response)
- Software issues
- Slow performance
- Printer problems
- Access requests

### Low (1 business day)
- How-to questions
- Feature requests
- General inquiries

## Self-Service Resources
Before submitting a ticket, check:
- **Knowledge Base:** Browse articles in PDSdesk
- **FAQ Section:** Common issues solved
- **How-to Guides:** Step-by-step instructions

We''re here to help!',
    'IT Support',
    'published',
    ARRAY['support', 'help', 'ticket', 'contact', 'priority'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- CATEGORY 3: HOW-TO GUIDES
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'save-files-onedrive',
    'How to Save Files to OneDrive',
    '# How to Save Files to OneDrive

## Why Use OneDrive?
- **Automatic backup** - Never lose your work
- **Access anywhere** - Files available on any device
- **Collaboration** - Share with team members easily
- **Version history** - Restore previous versions

## Saving New Documents

### In Word, Excel, PowerPoint:
1. Click **File** → **Save As**
2. Choose **OneDrive - Prompt & Pause**
3. Select folder (or create new one)
4. Name your file
5. Click **Save**

### Default Save Location:
Your OneDrive is already set as default. Just click **Save** and files go to OneDrive automatically!

## Moving Existing Files

### Method 1: Drag and Drop
1. Open **File Explorer**
2. Navigate to your file
3. Drag file to **OneDrive - Prompt & Pause** folder
4. File automatically syncs

### Method 2: Copy/Paste
1. Right-click file → **Copy**
2. Open **OneDrive - Prompt & Pause** folder
3. Right-click → **Paste**

## Check Sync Status
Look for these icons:
- **Green check** - Synced successfully
- **Blue arrows** - Currently syncing
- **Red X** - Sync error (submit a ticket through PDSdesk)
- **Cloud** - Available online only

## OneDrive Folder Location
**Path:** `C:\Users\[YourName]\OneDrive - Prompt & Pause`

**Quick Access:** Pinned to File Explorer sidebar

## Sharing Files with Teammates
1. Right-click file in OneDrive
2. Click **Share**
3. Enter teammate''s email
4. Set permissions (view or edit)
5. Click **Send**

**Tip:** All your work is automatically backed up. Save to OneDrive for peace of mind!

**Questions?** Submit a ticket through PDSdesk.',
    'How-to Guides',
    'published',
    ARRAY['onedrive', 'files', 'save', 'backup', 'sync', 'share'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'set-email-signature',
    'How to Set Your Email Signature',
    '# How to Set Your Email Signature

## Automatic Signature
Your email signature is **automatically created** when you first log in!

## Editing Your Signature

### In Outlook:
1. Open **Outlook**
2. Click **File** → **Options**
3. Click **Mail** (left sidebar)
4. Click **Signatures** button
5. Select **"Prompt and Pause Corporate"**

### What You Can Edit:
- **Your name** - Change to preferred format
- **Job title** - Update if your role changes
- **Email address** - Add alternate email
- **Phone number** - Add your direct line/mobile
- **Office location** - Update your address

### What You Cannot Change:
- Company name
- Social media links
- Company logo
- Website link
- Confidentiality notice
- Colors and formatting

## Setting as Default

### For New Emails:
In Signature settings:
- **New messages:** Select "Prompt and Pause Corporate"
- Click **OK**

### For Replies/Forwards:
In Signature settings:
- **Replies/forwards:** Select "Prompt and Pause Corporate"
- Click **OK**

## Signature Won''t Update?
1. Close Outlook completely
2. Sign out of RDS
3. Sign back in
4. Signature will refresh

**Need help?** Submit a ticket through PDSdesk.',
    'How-to Guides',
    'published',
    ARRAY['email', 'signature', 'outlook', 'setup'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'how-to-print',
    'How to Print Documents',
    '# How to Print Documents

## Setting Up Your Printer

### From RDS Session:
1. **Before connecting to RDS:**
   - Ensure your local printer is powered on
   - Printer must be connected to your computer

2. **Connect to RDS:**
   - Open **Remote Desktop Connection**
   - Click **Show Options**
   - Click **Local Resources** tab
   - Click **More...** under Local devices
   - Check **Printers**
   - Click **OK** and connect

3. **Print:**
   - Your local printer will appear in print dialog
   - Named: `[Printer Name] (redirected [session])`

## Printing from Office Apps

### In Word/Excel/PowerPoint:
1. Click **File** → **Print**
2. Select your printer from dropdown
3. Choose settings (pages, copies, etc.)
4. Click **Print**

### Quick Print:
- Press **Ctrl + P**
- Select printer
- Click **Print**

## Common Printer Issues

### Printer Not Showing?
**Solution:**
1. Disconnect from RDS
2. Ensure printer is on and connected locally
3. Reconnect to RDS with printer redirection enabled

### Print Job Stuck?
**Solution:**
1. On your **local computer** (not RDS)
2. Open **Devices and Printers**
3. Right-click printer → **See what''s printing**
4. Right-click stuck job → **Cancel**

### Poor Print Quality?
**Solution:**
- Check printer settings (draft vs. high quality)
- Verify printer has ink/toner
- Clean printer heads (check printer manual)

## PDF Instead of Printing
**Save paper!** Print to PDF:
1. Click **File** → **Print**
2. Select **Microsoft Print to PDF**
3. Click **Print**
4. Choose save location
5. Name file and click **Save**

**Printer issues?** Submit a ticket through PDSdesk.',
    'How-to Guides',
    'published',
    ARRAY['print', 'printer', 'pdf', 'rds', 'redirect'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- CATEGORY 4: FAQ
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'frequently-asked-questions',
    'Frequently Asked Questions',
    '# Frequently Asked Questions

## General Questions

### Q: What are my working hours?
**A:** Check with your manager. RDS is available 24/7.

### Q: Can I access RDS from home?
**A:** Yes! Connect from any device with internet.

### Q: What happens if I forget my password?
**A:** Submit a password reset ticket through PDSdesk - We''ll reset it within 2 hours.

### Q: Can I use my personal email for work?
**A:** No. Use only your @promptandpause.com email for work communications.

## Technical Questions

### Q: Why is my session slow?
**A:**
- Check your internet speed (need 10+ Mbps)
- Close unused applications
- Restart your session
- Submit a ticket through PDSdesk if problem persists

### Q: Can I install software?
**A:** No. Only IT can install software. Submit a software request ticket through PDSdesk.

### Q: Where are my files stored?
**A:** All files should be saved to **OneDrive - Prompt & Pause** for automatic backup.

### Q: What if I accidentally delete a file?
**A:**
1. Open **OneDrive** (web)
2. Click **Recycle bin** (left sidebar)
3. Right-click file → **Restore**
4. Files kept for 30 days

### Q: Can I access RDS on my phone?
**A:** Yes! Download **Microsoft Remote Desktop** app for iOS/Android.

### Q: What browser should I use?
**A:** **Microsoft Edge** (pre-installed and configured).

## Security Questions

### Q: How do I create a strong password?
**A:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Don''t use personal info
- Don''t reuse passwords

### Q: Can I share my password?
**A:** **Never!** Each person must have their own account.

### Q: What if I suspect a security issue?
**A:** **Immediately** submit an urgent ticket through PDSdesk with subject "Security Issue"

### Q: Can I use USB drives?
**A:** USB drives are disabled for security. Use OneDrive instead.

## Office 365 Questions

### Q: Why does Word/Excel ask me to sign in?
**A:** It shouldn''t! You''re auto-signed in. If it asks, just close the dialog. Submit a ticket if it persists.

### Q: Can I use Office on my personal computer?
**A:** Yes! Download from https://office.com with your @promptandpause.com account.

### Q: How much OneDrive storage do I have?
**A:** 1TB (1,000 GB) - That''s thousands of documents!

### Q: Can I share files with people outside the company?
**A:** Yes, but check with your manager first for sensitive information.

## Still Have Questions?
- **Portal:** Submit a ticket through PDSdesk
- **Email:** servicedesk@promptandpause.com
- **Knowledge Base:** Browse other articles

We''re here to help!',
    'FAQ',
    'published',
    ARRAY['faq', 'questions', 'answers', 'help', 'common'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- CATEGORY 5: POLICIES & COMPLIANCE
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'acceptable-use-policy',
    'Acceptable Use Policy',
    '# Acceptable Use Policy

## Purpose
This policy defines acceptable use of Prompt & Pause IT resources.

## Acceptable Use

### You MAY:
- Use company email for work communications
- Access work files from any device via RDS
- Use Microsoft Office for work documents
- Browse work-related websites
- Use approved collaboration tools (Teams, OneDrive)
- Access company resources securely

### You MAY NOT:
- Share your password with anyone
- Install unauthorized software
- Use company resources for personal business
- Access inappropriate or illegal content
- Download pirated software or media
- Bypass security measures
- Share confidential information externally (without approval)
- Use company email for spam or chain letters

## Password Requirements
- **Minimum length:** 12 characters
- **Complexity:** Mix of upper/lower case, numbers, symbols
- **Change:** Every 90 days
- **Lockout:** Account locks after 5 failed attempts (30 min)
- **Never share** your password

## Data Security
- **Save all work files** to OneDrive (automatic backup)
- **Don''t store** confidential data on personal devices
- **Encrypt** sensitive emails (ask IT how)
- **Report** suspicious emails by submitting a ticket through PDSdesk

## Remote Work
- **Use secure networks** - Avoid public WiFi when possible
- **Lock your screen** when away from computer (Windows + L)
- **Close RDS** when finished working
- **Don''t share screen** in video calls if confidential data visible

## Violations
Policy violations may result in:
- Warning
- Account suspension
- Termination of employment
- Legal action (for serious breaches)

## Questions?
Submit a ticket through PDSdesk or email servicedesk@promptandpause.com

**Last Updated:** January 2026
**Next Review:** January 2027',
    'Policies & Compliance',
    'published',
    ARRAY['policy', 'acceptable use', 'rules', 'compliance', 'security'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'data-protection-privacy',
    'Data Protection & Privacy (GDPR Compliance)',
    '# Data Protection & Privacy (GDPR Compliance)

## Our Commitment
Prompt & Pause is committed to protecting personal data in compliance with GDPR.

## What Data We Collect

### Employee Data:
- Name, email, phone number
- Job title, department
- Login activity, system usage
- Files you create and store

## How We Use Your Data
- **Access provision:** Your account and permissions
- **Security:** Monitor for unauthorized access
- **Support:** Help with technical issues
- **Compliance:** Legal and regulatory requirements

## Your Rights

### You Have the Right To:
- **Access** your personal data
- **Correct** inaccurate information
- **Delete** your data (after employment ends)
- **Export** your data (portable format)
- **Object** to certain processing

### To Exercise Your Rights:
Submit a ticket through PDSdesk with subject "Data Protection Request"

## Data Security Measures
- **Encryption:** Data encrypted in transit and at rest
- **Access Control:** Only authorized personnel access data
- **Monitoring:** Security monitoring 24/7
- **Backups:** Regular backups, stored securely
- **Audit Logs:** All access logged and reviewed

## Data Retention
- **Active employees:** Data retained during employment
- **Former employees:** Data deleted 90 days after departure (except legally required records)
- **Backups:** Retained for 1 year for disaster recovery

## Sharing Your Data
We **never** sell your data. We only share with:
- **Service providers** (Microsoft 365, Azure) - under strict contracts
- **Legal authorities** - when legally required

## Questions or Concerns?
**Data Protection Officer:** privacy@promptandpause.com
**IT Support:** Submit a ticket through PDSdesk

**Last Updated:** January 2026',
    'Policies & Compliance',
    'published',
    ARRAY['gdpr', 'privacy', 'data protection', 'compliance', 'rights'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- CATEGORY 6: SECURITY & ACCESS
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'password-best-practices',
    'Password Security Best Practices',
    '# Password Security Best Practices

## Creating Strong Passwords

### Requirements:
- **Minimum 12 characters**
- **Mix:** Uppercase, lowercase, numbers, symbols
- **Unique:** Different for each account
- **Not:** Dictionary words, personal info, patterns

### Good Examples:
- `Tr0pic@l$unset2026!`
- `C0ffee&Laptop#42`
- `London!Rain$2026`

### Bad Examples:
- `password123`
- `Promptandpause`
- `January2026`
- Your name, birthday, etc.

## Password Tips

### DO:
- Use a password manager (ask IT for recommendations)
- Create unique password for work account
- Change password every 90 days
- Lock your screen when away (Windows + L)
- Report suspicious login attempts

### DON''T:
- Write passwords on sticky notes
- Share passwords with anyone (including IT!)
- Use same password for multiple accounts
- Send passwords via email
- Use personal information

## Password Reset

### Forgot Your Password?
1. Submit a password reset ticket through PDSdesk
2. Include: Your name and username
3. We''ll reset within 2 hours
4. You''ll receive temporary password
5. Change it immediately upon login

### Account Locked?
**Happens after 5 failed login attempts**

**Wait:** 30 minutes for automatic unlock
**OR**
**Contact:** Submit an urgent ticket through PDSdesk for immediate unlock

## Multi-Factor Authentication (MFA)

### Coming Soon!
We''re implementing MFA for extra security:
- Something you know (password)
- Something you have (phone)

You''ll be notified before rollout.

## Suspicious Activity?

### Warning Signs:
- Login notification from unfamiliar location
- Password reset you didn''t request
- Emails you didn''t send
- Files modified you didn''t touch

### If You Suspect Compromise:
1. **Immediately** change your password
2. Submit an urgent ticket through PDSdesk
3. **Subject:** "Account Compromise"
4. **Don''t** delete anything (we need to investigate)

## Security is Everyone''s Responsibility!

**Questions?** Submit a ticket through PDSdesk.',
    'Security & Access',
    'published',
    ARRAY['password', 'security', 'mfa', 'login', 'account'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'recognizing-phishing',
    'Recognizing Phishing & Security Threats',
    '# Recognizing Phishing & Security Threats

## What is Phishing?
Fraudulent emails trying to steal your password or information.

## Warning Signs

### Red Flags:
- **Unexpected emails** asking for password/personal info
- **Urgent language:** "Act now!" "Account suspended!"
- **Generic greetings:** "Dear user" instead of your name
- **Suspicious links:** Hover to see real URL (don''t click!)
- **Poor grammar/spelling**
- **Mismatched email** addresses (says Microsoft but from @gmail.com)
- **Unexpected attachments**

### Common Phishing Examples:

**Example 1:**
```
From: IT Support <admin@gmail.com>
Subject: URGENT: Password Expires Today!

Your password will expire in 1 hour. Click here to reset:
http://fake-promptandpause.com/reset

- IT Department
```
**RED FLAG:** Real IT never asks for passwords via email!

**Example 2:**
```
From: Microsoft 365 <security@microsoft-update.net>
Subject: Security Alert

Suspicious activity detected on your account.
Verify your identity immediately: [LINK]
```
**RED FLAG:** Wrong sender domain, urgent language!

## What To Do

### If You Receive Suspicious Email:

**DO:**
1. **Don''t click** any links
2. **Don''t download** attachments
3. **Don''t reply**
4. **Submit a ticket** through PDSdesk with subject "Suspicious Email"
5. **Delete** original email

**DON''T:**
- Open attachments
- Click links
- Provide any information
- Forward to colleagues (you might spread it!)

### If You Clicked a Phishing Link:

**Immediate Actions:**
1. **Don''t panic** (but act fast!)
2. **Change your password** immediately
3. **Disconnect** from network (if possible)
4. **Submit an urgent ticket** through PDSdesk
5. **Subject:** "Phishing Incident"
6. **Include:** What you clicked, when, what happened

## Legitimate Company Communications

### Real IT Emails Will:
- Come from @promptandpause.com
- Address you by name
- Never ask for passwords
- Never create urgency for credentials
- Be professional, no spelling errors

### We Will NEVER:
- Ask for password via email
- Request banking/personal info via email
- Threaten account closure
- Send unsolicited password resets

## Other Security Threats

### Ransomware:
- Encrypts your files, demands payment
- **Prevention:** Don''t open suspicious attachments

### Malware:
- Malicious software that harms systems
- **Prevention:** Don''t download from untrusted sources

### Social Engineering:
- Manipulation to reveal information
- **Prevention:** Verify identity before sharing info

## When in Doubt...

### Ask Yourself:
1. Was I expecting this email?
2. Do I know the sender?
3. Does this make sense?
4. Why are they asking for this?

### If Unsure:
Submit a ticket through PDSdesk with subject "Please Verify - Suspicious Email"

**Better safe than sorry!**

## Report Suspicious Activity
See something suspicious? Report it!
- **Portal:** Submit a ticket through PDSdesk
- **Subject:** "Security Concern"

**Security is a team effort!**

**Questions?** Submit a ticket through PDSdesk.',
    'Security & Access',
    'published',
    ARRAY['phishing', 'security', 'email', 'scam', 'threats', 'malware'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- CATEGORY 7: HR & BENEFITS
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'time-off-requests',
    'Requesting Time Off',
    '# Requesting Time Off

## Annual Leave

### How to Request:
1. Discuss with your **line manager** first
2. Email request to: **hr@promptandpause.com**
3. Include:
   - Start date
   - End date
   - Number of days
   - Reason (optional)

### Response Time:
- **Normal requests:** 3 business days
- **Emergency:** Same day (call your manager)

### Notice Required:
- **1-5 days:** 1 week notice
- **6-10 days:** 2 weeks notice
- **11+ days:** 1 month notice

## Sick Leave

### Calling In Sick:
1. **Email your manager** as early as possible
2. **CC:** hr@promptandpause.com
3. **Include:** Expected return date (if known)

### Returning to Work:
- **1-2 days:** No doctor''s note required
- **3+ days:** Doctor''s note required (email to HR)

## Other Leave Types

### Compassionate Leave:
Contact your manager immediately. We understand emergencies happen.

### Parental Leave:
Email HR as soon as possible to discuss options and entitlements.

### Public Holidays:
Check company calendar (emailed at year start)

## Annual Leave Entitlement
- **Standard:** 25 days per year
- **+ UK Public Holidays:** 8 days
- **Total:** 33 days paid leave

(Check your contract for your specific entitlement)

## Questions?
**HR Department:** hr@promptandpause.com

*Last Updated: January 2026*',
    'HR & Benefits',
    'published',
    ARRAY['leave', 'time off', 'holiday', 'sick', 'hr', 'vacation'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- CATEGORY 8: SOFTWARE & TOOLS
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'microsoft-office-quick-start',
    'Microsoft Office Quick Start Guide',
    '# Microsoft Office Quick Start Guide

## Available Applications

### Pre-installed on RDS:
- **Word** - Documents
- **Excel** - Spreadsheets
- **PowerPoint** - Presentations
- **Outlook** - Email & Calendar
- **OneNote** - Note-taking
- **Teams** - Chat & Meetings
- **Edge** - Web browser

## Word Basics

### Creating Documents:
1. Click **Word** icon on taskbar
2. Choose **Blank document**
3. Start typing!
4. **Save:** Ctrl + S (saves to OneDrive automatically)

### Common Shortcuts:
- **Ctrl + B** - Bold
- **Ctrl + I** - Italic
- **Ctrl + U** - Underline
- **Ctrl + Z** - Undo
- **Ctrl + Y** - Redo
- **Ctrl + F** - Find
- **Ctrl + P** - Print

## Excel Basics

### Creating Spreadsheets:
1. Click **Excel** icon
2. Choose **Blank workbook**
3. Enter data in cells
4. **Auto-save** enabled (saves to OneDrive)

### Common Functions:
- **=SUM(A1:A10)** - Add numbers
- **=AVERAGE(A1:A10)** - Calculate average
- **=COUNT(A1:A10)** - Count cells
- **=IF(A1>10,"Yes","No")** - Conditional logic

### Keyboard Shortcuts:
- **Ctrl + Arrow** - Jump to data edge
- **Ctrl + Shift + L** - Apply filter
- **Alt + =** - Auto sum
- **F2** - Edit cell

## PowerPoint Basics

### Creating Presentations:
1. Click **PowerPoint** icon
2. Choose template or blank
3. Click to add title/content
4. **New slide:** Ctrl + M

### Presenting:
- **F5** - Start from beginning
- **Shift + F5** - Start from current slide
- **Esc** - Exit presentation

## Outlook Basics

### Email:
1. **New email:** Ctrl + N
2. **Reply:** Ctrl + R
3. **Forward:** Ctrl + F
4. **Send:** Ctrl + Enter

### Calendar:
- **New appointment:** Ctrl + N (in Calendar view)
- **New meeting:** Ctrl + Shift + Q
- **View:** Ctrl + 2 to switch to calendar

### Your Signature:
Already set up automatically! Check File → Options → Mail → Signatures to customize.

## Teams Basics

### Starting a Chat:
1. Click **Teams** icon
2. Click **Chat** (left sidebar)
3. Click **New chat**
4. Type name, send message

### Starting a Meeting:
1. Click **Calendar** (left sidebar)
2. Click **New meeting**
3. Add attendees
4. Choose date/time
5. Click **Send**

## OneDrive

### Access Your Files:
- **File Explorer:** OneDrive - Prompt & Pause folder
- **Web:** https://office.com → OneDrive
- **Mobile:** OneDrive app

### Sharing Files:
1. Right-click file → **Share**
2. Enter email addresses
3. Set permissions (view/edit)
4. Click **Send**

## Edge Browser

### Features:
- **Collections:** Save and organize web content
- **Vertical tabs:** More screen space
- **Work accounts:** Auto-signed in to company sites

### Shortcuts:
- **Ctrl + T** - New tab
- **Ctrl + W** - Close tab
- **Ctrl + Shift + T** - Reopen closed tab
- **Ctrl + D** - Bookmark page

## Get More Help

### Microsoft Support:
- **Office help:** Press F1 in any app
- **Online training:** https://support.microsoft.com
- **In-app tips:** Click ? icon

### Company Support:
- **Portal:** Submit a ticket through PDSdesk
- **Email:** servicedesk@promptandpause.com

Happy creating!',
    'Software & Tools',
    'published',
    ARRAY['office', 'word', 'excel', 'powerpoint', 'outlook', 'teams', 'onedrive', 'edge'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

  -- ============================================
  -- BONUS: QUICK REFERENCE CARD
  -- ============================================

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by)
  VALUES (
    'quick-reference-card',
    'Prompt & Pause Quick Reference Card',
    '# Prompt & Pause Quick Reference Card

## Login
**RDS:** rds01.promptandpause.com
**Username:** PROMPTANDPAUSE\yourname
**Email:** yourname@promptandpause.com

## Support
**Portal:** PDSdesk
**Email:** servicedesk@promptandpause.com
**Response:** Within 4 hours

## Email
**Outlook:** Opens automatically
**Signature:** Already configured
**Calendar:** Ctrl + 2

## Files
**Save location:** OneDrive - Prompt & Pause
**Auto-backup:** Enabled
**Storage:** 1 TB

## Password
**Length:** 12+ characters
**Change:** Every 90 days
**Forgot?** Submit a ticket through PDSdesk

## Emergency
**Account locked:** Wait 30 min or submit urgent ticket
**Suspicious email:** Submit ticket through PDSdesk
**Can''t login:** Submit ticket through PDSdesk

## Apps
- Word, Excel, PowerPoint
- Outlook, Teams
- OneDrive, Edge

## Shortcuts
**Lock screen:** Windows + L
**Task Manager:** Ctrl + Alt + End
**Save:** Ctrl + S
**Print:** Ctrl + P

---
**Knowledge Base:** Browse articles in PDSdesk
**Keep this card handy!**',
    'FAQ',
    'published',
    ARRAY['quick reference', 'cheat sheet', 'shortcuts', 'summary'],
    v_author_id
  ) ON CONFLICT (slug) DO NOTHING;

END $$;
