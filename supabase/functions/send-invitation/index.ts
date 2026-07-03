import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

// Gmail SMTP credentials (an App Password, not your normal Gmail password -
// generate one at https://myaccount.google.com/apppasswords)
const GMAIL_ADDRESS = Deno.env.get('GMAIL_ADDRESS') || '';
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') || '';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase environment variables
    // These should be automatically available, but if not, set them as secrets:
    // supabase secrets set SUPABASE_URL=your_url
    // supabase secrets set SUPABASE_ANON_KEY=your_anon_key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey,
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables. Set them as secrets:');
      console.error('supabase secrets set SUPABASE_URL=your_url');
      console.error('supabase secrets set SUPABASE_ANON_KEY=your_anon_key');
      return new Response(
        JSON.stringify({ 
          error: 'Missing Supabase configuration',
          hint: 'Set SUPABASE_URL and SUPABASE_ANON_KEY as Edge Function secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header (should contain Bearer <JWT token>)
    // According to Supabase Edge Functions docs, we need to extract the token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authorization header received, length:', authHeader.length);
    console.log('Auth header preview:', authHeader.substring(0, 30) + '...');
    
    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '').trim();
    console.log('JWT token extracted, length:', token.length);
    console.log('Anon key available:', !!supabaseAnonKey, 'Length:', supabaseAnonKey.length);
    
    // Create Supabase client with the anon key
    // The anon key is required to validate JWTs
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verify the user is authenticated
    // According to Supabase docs, pass the token directly to getUser()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', {
        message: authError?.message,
        status: authError?.status,
        name: authError?.name,
      });
      console.error('Token validation failed. Check if SUPABASE_ANON_KEY is set correctly.');
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token',
          details: authError?.message || 'JWT validation failed. Ensure SUPABASE_ANON_KEY is available in Edge Function environment.'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse request body
    const { email, fullName, role, vaultOwnerId, vaultOwnerName } = await req.json();

    if (!email || !fullName || !vaultOwnerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is inviting for their own vault
    if (user.id !== vaultOwnerId) {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden',
          message: 'You can only invite people to your own vault'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get vault owner's profile
    const { data: ownerProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', vaultOwnerId)
      .single();

    const ownerEmail = ownerProfile?.email || user.email || 'the vault owner';
    const ownerName = ownerProfile?.full_name || vaultOwnerName || user.user_metadata?.full_name || 'Vault Owner';

    // Email content
    const subject = `${ownerName} has invited you as a trusted person on Legate`;
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1B2A4A; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1B2A4A; color: #C9A84C; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #F9F7F4; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background-color: #1B2A4A; color: #C9A84C; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #5C6B8A; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-family: serif;">Legate</h1>
            </div>
            <div class="content">
              <h2>You've been invited as a trusted person</h2>
              <p>Hello ${fullName},</p>
              <p><strong>${ownerName}</strong> has invited you to be a trusted person on their Legate vault.</p>
              <p>As a trusted person, you'll be able to help access and manage their vault when the time comes, ensuring their loved ones have everything they need.</p>
              <p><strong>Your role:</strong> ${role === 'spouse' ? 'Spouse' : role === 'child' ? 'Child' : role === 'executor' ? 'Executor' : 'Trusted Person'}</p>
              <p>To accept this invitation and create your account, please download the Legate app and sign up using this email address: <strong>${email}</strong></p>
              <p style="margin-top: 30px;">If you didn't expect this invitation, you can safely ignore this email.</p>
              <div class="footer">
                <p>This email was sent by Legate on behalf of ${ownerName}.</p>
                <p>&copy; ${new Date().getFullYear()} Legate. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Hello ${fullName},

${ownerName} has invited you to be a trusted person on their Legate vault.

As a trusted person, you'll be able to help access and manage their vault when the time comes, ensuring their loved ones have everything they need.

Your role: ${role === 'spouse' ? 'Spouse' : role === 'child' ? 'Child' : role === 'executor' ? 'Executor' : 'Trusted Person'}

To accept this invitation and create your account, please download the Legate app and sign up using this email address: ${email}

If you didn't expect this invitation, you can safely ignore this email.

This email was sent by Legate on behalf of ${ownerName}.
    `;

    // Send email via Gmail SMTP
    if (!GMAIL_ADDRESS || !GMAIL_APP_PASSWORD) {
      console.warn('GMAIL_ADDRESS/GMAIL_APP_PASSWORD not set. Email will not be sent.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation saved but email not sent. Gmail SMTP is not configured.',
          invitationSaved: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_ADDRESS,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    try {
      await client.send({
        from: `Legate <${GMAIL_ADDRESS}>`,
        to: email,
        subject: subject,
        html: htmlBody,
        content: textBody,
      });
      await client.close();

      console.log('Email sent successfully via Gmail SMTP');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation email sent successfully!',
          invitationSaved: true,
          emailSent: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (emailError) {
      console.error('Error sending email via Gmail SMTP:', emailError);
      // Still return success since invitation is saved
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation saved but email failed to send.',
          invitationSaved: true,
          emailError: emailError.message
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
