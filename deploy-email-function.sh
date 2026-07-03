#!/bin/bash

# Deploy Send Invitation Email Function
# This script sets up and deploys the Edge Function with Gmail SMTP integration

echo "🚀 Deploying Send Invitation Email Function..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Step 1: Login to Supabase
echo "📝 Step 1: Login to Supabase"
echo "   Please login to Supabase when prompted..."
supabase login

# Step 2: Link project (you'll need your project ref)
echo ""
echo "📝 Step 2: Link your Supabase project"
echo "   You'll need your project reference ID from your Supabase dashboard"
echo "   (found in Project Settings > General > Reference ID)"
read -p "Enter your Supabase project reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference ID is required"
    exit 1
fi

supabase link --project-ref "$PROJECT_REF"

# Step 3: Set Gmail SMTP credentials as secrets
echo ""
echo "📝 Step 3: Set your Gmail SMTP credentials as secrets"
echo "   Generate an App Password at https://myaccount.google.com/apppasswords"
echo "   (requires 2-Step Verification to be enabled on the Google account)"
read -p "Enter your Gmail address: " GMAIL_ADDRESS
read -s -p "Enter your Gmail App Password: " GMAIL_APP_PASSWORD
echo ""

if [ -z "$GMAIL_ADDRESS" ] || [ -z "$GMAIL_APP_PASSWORD" ]; then
    echo "❌ Gmail address and App Password are required"
    exit 1
fi

supabase secrets set GMAIL_ADDRESS="$GMAIL_ADDRESS"
supabase secrets set GMAIL_APP_PASSWORD="$GMAIL_APP_PASSWORD"

# Step 4: Deploy the function
echo ""
echo "📝 Step 4: Deploying Edge Function..."
supabase functions deploy send-invitation

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📧 The function is now ready to send invitation emails."
echo "   Test it by inviting a trusted person from the app."
echo ""
echo "📊 To check logs:"
echo "   supabase functions logs send-invitation"
echo ""
echo "🔍 To verify secrets:"
echo "   supabase secrets list"
