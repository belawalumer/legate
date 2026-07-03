#!/bin/bash

# Deploy Send Invitation Email Function
# This script sets up and deploys the Edge Function with Resend integration

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

# Step 3: Set Resend API key as secret
echo ""
echo "📝 Step 3: Setting Resend API key as secret..."
supabase secrets set RESEND_API_KEY=re_MXng5bm9_HxC1mpwMXgMgwVVNGa3R6TGk

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
