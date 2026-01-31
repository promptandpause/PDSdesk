-- Direct insert of KB articles using a valid user ID
-- First get a valid user ID from profiles

DO $$
DECLARE
  v_author_id uuid;
BEGIN
  -- Get any existing user from profiles
  SELECT id INTO v_author_id 
  FROM public.profiles 
  LIMIT 1;
  
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table';
  END IF;

  -- Delete any existing articles to start fresh
  DELETE FROM public.knowledge_articles WHERE slug IN (
    'welcome-first-day', 'getting-started-rds', 'common-rds-issues', 'contacting-it-support',
    'save-files-onedrive', 'set-email-signature', 'how-to-print', 'frequently-asked-questions',
    'acceptable-use-policy', 'data-protection-privacy', 'password-best-practices', 
    'recognizing-phishing', 'time-off-requests', 'microsoft-office-quick-start', 'quick-reference-card'
  );

  -- ONBOARDING
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('welcome-first-day', 'Welcome to Prompt & Pause - Your First Day', 
   E'# Welcome to Prompt & Pause\n\nWelcome to the team! This guide will help you get started on your first day.\n\n## What You''ll Receive\n- **Email:** yourname@promptandpause.com\n- **RDP Access:** Login credentials for remote desktop\n- **Microsoft 365:** Office apps, OneDrive, Teams\n\n## First Steps\n1. **Log in to RDS** using your credentials\n2. **Check your email** in Outlook (opens automatically)\n3. **Review company policies** in the HR folder\n4. **Set up your OneDrive** (syncs automatically)\n\n## Need Help?\nContact our IT Service Desk:\n- **Email:** servicedesk@promptandpause.com\n- **Portal:** Submit a ticket through PDSdesk\n\nYour manager will schedule your onboarding sessions. Welcome aboard!',
   'Onboarding', 'published', ARRAY['welcome', 'first day', 'new employee'], v_author_id);

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('getting-started-rds', 'Getting Started with Remote Desktop (RDS)',
   E'# Getting Started with Remote Desktop (RDS)\n\n## What is RDS?\nRemote Desktop Services lets you access your work computer from anywhere.\n\n## How to Connect\n\n### From Windows:\n1. Press **Windows Key + R**\n2. Type: `mstsc`\n3. Enter: `rds01.promptandpause.com`\n4. Username: `PROMPTANDPAUSE\\yourname`\n5. Password: Your company password\n\n### From Mac:\n1. Download **Microsoft Remote Desktop** from App Store\n2. Click **Add PC**\n3. PC name: `rds01.promptandpause.com`\n4. Add your credentials\n5. Click **Connect**\n\n## First Login\n- Your desktop will load (may take 30-60 seconds)\n- OneDrive will start syncing automatically\n- Office apps are ready to use\n\n**Questions?** Submit a ticket through PDSdesk',
   'Onboarding', 'published', ARRAY['rds', 'remote desktop', 'login'], v_author_id);

  -- IT SUPPORT
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('common-rds-issues', 'Common RDS Issues & Solutions',
   E'# Common RDS Issues & Solutions\n\n## Cannot Connect to Remote Desktop\n\n### Solution 1: Check Your Internet\n- Ensure you have stable internet connection\n- Try: `ping rds01.promptandpause.com` in Command Prompt\n\n### Solution 2: Verify Credentials\n- Username format: `PROMPTANDPAUSE\\yourname`\n- Password is case-sensitive\n- If forgotten, submit a password reset ticket through PDSdesk\n\n## Slow Performance\n\n### Quick Fixes:\n1. **Close unused applications**\n2. **Clear browser cache** - Edge → Settings → Privacy → Clear browsing data\n3. **Restart your session** - Sign out and sign back in\n4. **Check your internet speed** - Minimum 10 Mbps recommended\n\n## Screen is Black After Login\n\n1. Press **Ctrl + Alt + End**\n2. Click **Task Manager**\n3. File → Run new task\n4. Type: `explorer.exe`\n5. Click **OK**\n\n**Still stuck?** Submit a ticket through PDSdesk.',
   'IT Support', 'published', ARRAY['rds', 'troubleshooting', 'connection'], v_author_id);

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('contacting-it-support', 'How to Contact IT Support',
   E'# How to Contact IT Support\n\n## PDSdesk Service Portal\n- **Portal:** Access PDSdesk from your browser\n- **Email:** servicedesk@promptandpause.com\n- **Response Time:** Within 4 business hours\n\n## What to Include in Your Ticket\n1. **Your name and email**\n2. **What you were trying to do**\n3. **What happened instead**\n4. **Screenshots** (if applicable)\n5. **Error messages** (exact wording)\n\n## Priority Levels\n\n### Urgent (2 hour response)\n- Cannot access RDS at all\n- Email completely down\n- Security incident\n\n### Normal (4 hour response)\n- Software issues\n- Slow performance\n- Printer problems\n\n### Low (1 business day)\n- How-to questions\n- Feature requests\n\nWe''re here to help!',
   'IT Support', 'published', ARRAY['support', 'help', 'ticket', 'contact'], v_author_id);

  -- HOW-TO GUIDES
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('save-files-onedrive', 'How to Save Files to OneDrive',
   E'# How to Save Files to OneDrive\n\n## Why Use OneDrive?\n- **Automatic backup** - Never lose your work\n- **Access anywhere** - Files available on any device\n- **Collaboration** - Share with team members easily\n\n## Saving New Documents\n\n### In Word, Excel, PowerPoint:\n1. Click **File** → **Save As**\n2. Choose **OneDrive - Prompt & Pause**\n3. Select folder (or create new one)\n4. Name your file\n5. Click **Save**\n\n## Check Sync Status\n- **Green check** - Synced successfully\n- **Blue arrows** - Currently syncing\n- **Red X** - Sync error (submit a ticket through PDSdesk)\n\n## Sharing Files with Teammates\n1. Right-click file in OneDrive\n2. Click **Share**\n3. Enter teammate''s email\n4. Set permissions (view or edit)\n5. Click **Send**\n\n**Questions?** Submit a ticket through PDSdesk.',
   'How-to Guides', 'published', ARRAY['onedrive', 'files', 'save', 'backup'], v_author_id);

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('set-email-signature', 'How to Set Your Email Signature',
   E'# How to Set Your Email Signature\n\n## Automatic Signature\nYour email signature is **automatically created** when you first log in!\n\n## Editing Your Signature\n\n### In Outlook:\n1. Open **Outlook**\n2. Click **File** → **Options**\n3. Click **Mail** (left sidebar)\n4. Click **Signatures** button\n5. Select **"Prompt and Pause Corporate"**\n\n### What You Can Edit:\n- **Your name** - Change to preferred format\n- **Job title** - Update if your role changes\n- **Phone number** - Add your direct line/mobile\n\n### What You Cannot Change:\n- Company name\n- Company logo\n- Confidentiality notice\n\n## Signature Won''t Update?\n1. Close Outlook completely\n2. Sign out of RDS\n3. Sign back in\n4. Signature will refresh\n\n**Need help?** Submit a ticket through PDSdesk.',
   'How-to Guides', 'published', ARRAY['email', 'signature', 'outlook'], v_author_id);

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('how-to-print', 'How to Print Documents',
   E'# How to Print Documents\n\n## Setting Up Your Printer\n\n### From RDS Session:\n1. **Before connecting to RDS:**\n   - Ensure your local printer is powered on\n   - Printer must be connected to your computer\n\n2. **Connect to RDS:**\n   - Open **Remote Desktop Connection**\n   - Click **Show Options**\n   - Click **Local Resources** tab\n   - Click **More...** under Local devices\n   - Check **Printers**\n   - Click **OK** and connect\n\n## Printing from Office Apps\n\n1. Click **File** → **Print**\n2. Select your printer from dropdown\n3. Choose settings (pages, copies, etc.)\n4. Click **Print**\n\n### Quick Print:\n- Press **Ctrl + P**\n\n## PDF Instead of Printing\n1. Click **File** → **Print**\n2. Select **Microsoft Print to PDF**\n3. Click **Print**\n4. Choose save location\n\n**Printer issues?** Submit a ticket through PDSdesk.',
   'How-to Guides', 'published', ARRAY['print', 'printer', 'pdf'], v_author_id);

  -- FAQ
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('frequently-asked-questions', 'Frequently Asked Questions',
   E'# Frequently Asked Questions\n\n## General Questions\n\n### Q: Can I access RDS from home?\n**A:** Yes! Connect from any device with internet.\n\n### Q: What happens if I forget my password?\n**A:** Submit a password reset ticket through PDSdesk - We''ll reset it within 2 hours.\n\n## Technical Questions\n\n### Q: Why is my session slow?\n**A:**\n- Check your internet speed (need 10+ Mbps)\n- Close unused applications\n- Restart your session\n\n### Q: Can I install software?\n**A:** No. Only IT can install software. Submit a software request ticket through PDSdesk.\n\n### Q: Where are my files stored?\n**A:** All files should be saved to **OneDrive - Prompt & Pause** for automatic backup.\n\n## Security Questions\n\n### Q: Can I share my password?\n**A:** **Never!** Each person must have their own account.\n\n### Q: Can I use USB drives?\n**A:** USB drives are disabled for security. Use OneDrive instead.\n\n## Still Have Questions?\nSubmit a ticket through PDSdesk!',
   'FAQ', 'published', ARRAY['faq', 'questions', 'answers', 'help'], v_author_id);

  -- POLICIES & COMPLIANCE
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('acceptable-use-policy', 'Acceptable Use Policy',
   E'# Acceptable Use Policy\n\n## Purpose\nThis policy defines acceptable use of Prompt & Pause IT resources.\n\n## Acceptable Use\n\n### You MAY:\n- Use company email for work communications\n- Access work files from any device via RDS\n- Use Microsoft Office for work documents\n- Use approved collaboration tools (Teams, OneDrive)\n\n### You MAY NOT:\n- Share your password with anyone\n- Install unauthorized software\n- Use company resources for personal business\n- Access inappropriate or illegal content\n- Bypass security measures\n\n## Password Requirements\n- **Minimum length:** 12 characters\n- **Complexity:** Mix of upper/lower case, numbers, symbols\n- **Change:** Every 90 days\n- **Never share** your password\n\n## Violations\nPolicy violations may result in:\n- Warning\n- Account suspension\n- Termination of employment\n\n**Questions?** Submit a ticket through PDSdesk\n\n**Last Updated:** January 2026',
   'Policies & Compliance', 'published', ARRAY['policy', 'acceptable use', 'rules'], v_author_id);

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('data-protection-privacy', 'Data Protection & Privacy (GDPR Compliance)',
   E'# Data Protection & Privacy (GDPR Compliance)\n\n## Our Commitment\nPrompt & Pause is committed to protecting personal data in compliance with GDPR.\n\n## What Data We Collect\n- Name, email, phone number\n- Job title, department\n- Login activity, system usage\n- Files you create and store\n\n## Your Rights\n\n### You Have the Right To:\n- **Access** your personal data\n- **Correct** inaccurate information\n- **Delete** your data (after employment ends)\n- **Export** your data (portable format)\n\n### To Exercise Your Rights:\nSubmit a ticket through PDSdesk with subject "Data Protection Request"\n\n## Data Security Measures\n- **Encryption:** Data encrypted in transit and at rest\n- **Access Control:** Only authorized personnel access data\n- **Backups:** Regular backups, stored securely\n\n**Questions?** Submit a ticket through PDSdesk\n\n**Last Updated:** January 2026',
   'Policies & Compliance', 'published', ARRAY['gdpr', 'privacy', 'data protection'], v_author_id);

  -- SECURITY & ACCESS
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('password-best-practices', 'Password Security Best Practices',
   E'# Password Security Best Practices\n\n## Creating Strong Passwords\n\n### Requirements:\n- **Minimum 12 characters**\n- **Mix:** Uppercase, lowercase, numbers, symbols\n- **Unique:** Different for each account\n\n### Good Examples:\n- `Tr0pic@l$unset2026!`\n- `C0ffee&Laptop#42`\n\n### Bad Examples:\n- `password123`\n- `January2026`\n- Your name, birthday, etc.\n\n## Password Tips\n\n### DO:\n- Use a password manager\n- Change password every 90 days\n- Lock your screen when away (Windows + L)\n\n### DON''T:\n- Write passwords on sticky notes\n- Share passwords with anyone\n- Use same password for multiple accounts\n\n## Password Reset\n\n1. Submit a password reset ticket through PDSdesk\n2. We''ll reset within 2 hours\n3. Change it immediately upon login\n\n## Account Locked?\n**Wait:** 30 minutes for automatic unlock\n**OR** Submit an urgent ticket through PDSdesk',
   'Security & Access', 'published', ARRAY['password', 'security', 'login'], v_author_id);

  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('recognizing-phishing', 'Recognizing Phishing & Security Threats',
   E'# Recognizing Phishing & Security Threats\n\n## What is Phishing?\nFraudulent emails trying to steal your password or information.\n\n## Warning Signs\n\n### Red Flags:\n- **Unexpected emails** asking for password/personal info\n- **Urgent language:** "Act now!" "Account suspended!"\n- **Generic greetings:** "Dear user" instead of your name\n- **Suspicious links:** Hover to see real URL (don''t click!)\n- **Poor grammar/spelling**\n\n## What To Do\n\n### If You Receive Suspicious Email:\n1. **Don''t click** any links\n2. **Don''t download** attachments\n3. **Don''t reply**\n4. **Submit a ticket** through PDSdesk with subject "Suspicious Email"\n5. **Delete** original email\n\n### If You Clicked a Phishing Link:\n1. **Change your password** immediately\n2. **Submit an urgent ticket** through PDSdesk\n3. **Subject:** "Phishing Incident"\n\n## We Will NEVER:\n- Ask for password via email\n- Threaten account closure\n- Send unsolicited password resets\n\n**Security is a team effort!**',
   'Security & Access', 'published', ARRAY['phishing', 'security', 'email', 'scam'], v_author_id);

  -- HR & BENEFITS
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('time-off-requests', 'Requesting Time Off',
   E'# Requesting Time Off\n\n## Annual Leave\n\n### How to Request:\n1. Discuss with your **line manager** first\n2. Email request to: **hr@promptandpause.com**\n3. Include:\n   - Start date\n   - End date\n   - Number of days\n\n### Notice Required:\n- **1-5 days:** 1 week notice\n- **6-10 days:** 2 weeks notice\n- **11+ days:** 1 month notice\n\n## Sick Leave\n\n### Calling In Sick:\n1. **Email your manager** as early as possible\n2. **CC:** hr@promptandpause.com\n3. **Include:** Expected return date (if known)\n\n### Returning to Work:\n- **1-2 days:** No doctor''s note required\n- **3+ days:** Doctor''s note required\n\n## Annual Leave Entitlement\n- **Standard:** 25 days per year\n- **+ UK Public Holidays:** 8 days\n- **Total:** 33 days paid leave\n\n**Questions?** Email hr@promptandpause.com',
   'HR & Benefits', 'published', ARRAY['leave', 'time off', 'holiday', 'sick', 'hr'], v_author_id);

  -- SOFTWARE & TOOLS
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('microsoft-office-quick-start', 'Microsoft Office Quick Start Guide',
   E'# Microsoft Office Quick Start Guide\n\n## Available Applications\n\n### Pre-installed on RDS:\n- **Word** - Documents\n- **Excel** - Spreadsheets\n- **PowerPoint** - Presentations\n- **Outlook** - Email & Calendar\n- **Teams** - Chat & Meetings\n- **Edge** - Web browser\n\n## Word Basics\n\n### Common Shortcuts:\n- **Ctrl + B** - Bold\n- **Ctrl + I** - Italic\n- **Ctrl + S** - Save\n- **Ctrl + Z** - Undo\n- **Ctrl + P** - Print\n\n## Excel Basics\n\n### Common Functions:\n- **=SUM(A1:A10)** - Add numbers\n- **=AVERAGE(A1:A10)** - Calculate average\n- **=COUNT(A1:A10)** - Count cells\n\n## Outlook Basics\n\n### Email:\n- **Ctrl + N** - New email\n- **Ctrl + R** - Reply\n- **Ctrl + Enter** - Send\n\n### Calendar:\n- **Ctrl + 2** - Switch to calendar\n- **Ctrl + Shift + Q** - New meeting\n\n## Get More Help\n- **Office help:** Press F1 in any app\n- **Company Support:** Submit a ticket through PDSdesk',
   'Software & Tools', 'published', ARRAY['office', 'word', 'excel', 'outlook', 'teams'], v_author_id);

  -- QUICK REFERENCE
  INSERT INTO public.knowledge_articles (slug, title, body, category, status, tags, created_by) VALUES
  ('quick-reference-card', 'Prompt & Pause Quick Reference Card',
   E'# Prompt & Pause Quick Reference Card\n\n## Login\n**RDS:** rds01.promptandpause.com\n**Username:** PROMPTANDPAUSE\\yourname\n**Email:** yourname@promptandpause.com\n\n## Support\n**Portal:** PDSdesk\n**Email:** servicedesk@promptandpause.com\n**Response:** Within 4 hours\n\n## Files\n**Save location:** OneDrive - Prompt & Pause\n**Auto-backup:** Enabled\n**Storage:** 1 TB\n\n## Password\n**Length:** 12+ characters\n**Change:** Every 90 days\n**Forgot?** Submit a ticket through PDSdesk\n\n## Emergency\n**Account locked:** Wait 30 min or submit urgent ticket\n**Suspicious email:** Submit ticket through PDSdesk\n\n## Apps\n- Word, Excel, PowerPoint\n- Outlook, Teams\n- OneDrive, Edge\n\n## Shortcuts\n**Lock screen:** Windows + L\n**Task Manager:** Ctrl + Alt + End\n**Save:** Ctrl + S\n**Print:** Ctrl + P\n\n---\n**Keep this card handy!**',
   'FAQ', 'published', ARRAY['quick reference', 'cheat sheet', 'shortcuts'], v_author_id);

  RAISE NOTICE 'Successfully inserted 15 KB articles';
END $$;
