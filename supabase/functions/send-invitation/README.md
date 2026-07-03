# Send Invitation Email Edge Function

This Edge Function sends invitation emails to trusted persons when they are added to a vault.

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy send-invitation
```

### 2. Configure Email Service

The function currently has a placeholder for email sending. You need to integrate with an email service. Here are popular options:

#### Option A: Using Resend (Recommended - Free tier available)

1. Sign up at https://resend.com
2. Get your API key
3. Add it as a Supabase secret:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

4. Update the function to use Resend:

```typescript
// Add at the top of index.ts
import { Resend } from 'https://esm.sh/resend@2.0.0';

// Replace the email sending section with:
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const { data, error } = await resend.emails.send({
  from: 'Legate <noreply@yourdomain.com>',
  to: email,
  subject: subject,
  html: htmlBody,
  text: textBody,
});

if (error) {
  console.error('Resend error:', error);
  throw error;
}
```

#### Option B: Using SendGrid

1. Sign up at https://sendgrid.com
2. Get your API key
3. Add it as a Supabase secret:

```bash
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key
```

4. Update the function to use SendGrid (similar to Resend)

#### Option C: Using AWS SES

1. Set up AWS SES
2. Add credentials as secrets
3. Use AWS SDK in the function

### 3. Set Required Secrets

```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Test the Function

After deployment, the function will be automatically called when a trusted person is invited from the app.

## Current Status

⚠️ **The function is currently a template and does NOT send emails yet.** 

You must:
1. Deploy the function to Supabase
2. Integrate with an email service (Resend, SendGrid, etc.)
3. Add the email service API key as a secret

Until then, invitations will be saved to the database but no emails will be sent.
