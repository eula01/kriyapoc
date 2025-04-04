import { NextResponse } from "next/server";
import { ZenRows } from "zenrows";
import OpenAI from "openai";
import { revalidatePath } from "next/cache";
import { fetchBuiltWithData } from "@/lib/util";

// Define the structure for the analyzed website data
export interface WebsiteAnalysis {
  short_description: string;
  products_and_services: string[];
  business_model: "B2B" | "B2C" | "Both" | "unknown";
  has_online_checkout: "Yes" | "No" | "unknown";
  ecommerce_platform: string | null;
  payment_service_provider: string | null;
}

// Handler for POST requests
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { website } = body;

    if (!website) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    console.log(`🔄 [API] Starting complete analysis for: ${website}`);

    // Extract website content
    console.log(`🔄 [API] Step 1: Extracting website content`);
    const content = await extractWebsiteContent(website);

    // Verify we have sufficient content for analysis
    const MIN_ANALYSIS_CONTENT = 100; // Minimum characters needed for a reasonable analysis
    if (
      !content ||
      content.length < MIN_ANALYSIS_CONTENT ||
      content ===
        "Failed to extract content from website after multiple attempts."
    ) {
      console.error(
        `❌ [API] Insufficient content for analysis: ${
          content.length
        } characters (${content.substring(0, 100)}...)`
      );
      return NextResponse.json(
        {
          error: "Failed to extract sufficient content from website",
          analysis: {
            short_description: "Could not analyze website content",
            products_and_services: ["unknown"],
            business_model: "unknown",
            has_online_checkout: "unknown",
            ecommerce_platform: null,
            payment_service_provider: null,
          },
        },
        { status: 422 } // 422 Unprocessable Entity
      );
    }
    console.log(`🔄 [API] Step 2: Running parallel analysis operations`);
    const [analysis, salesChannelsAnalysis, builtWithData] = await Promise.all([
      // OpenAI -- short description, products and services, business model, has online checkout
      analyzeWebsiteContent(content),

      // Perplexity -- sales channels
      analyzeSalesChannelsPerplexity(website),

      // BuiltWith -- ecommerce platform and payment processors
      fetchBuiltWithData(website),
    ]);

    console.log(
      `✅ [API] WEBSITE ANALYSIS DONE FOR ${website}`,
      analysis,
      salesChannelsAnalysis,
      builtWithData
    );

    revalidatePath("/accounts");
    // Combine all analysis results
    const combinedAnalysis = {
      ...analysis,
      ecommerce_platform: builtWithData.ecomm_provider,
      payment_service_provider: builtWithData.psp_or_card_processor
        ? Array.isArray(builtWithData.psp_or_card_processor)
          ? [...new Set(builtWithData.psp_or_card_processor)]
          : builtWithData.psp_or_card_processor
        : builtWithData.psp_or_card_processor,
    };

    return NextResponse.json({
      analysis: combinedAnalysis,
      salesChannelsAnalysis,
    });
  } catch (error) {
    console.error(`❌ [API] Error processing analyze-website request:`, error);

    return NextResponse.json(
      {
        error: "Failed to analyze website",
        analysis: {
          short_description: "unknown",
          products_and_services: ["unknown"],
          business_model: "unknown",
          has_online_checkout: "unknown",
          ecommerce_platform: null,
          payment_service_provider: null,
        },
        salesChannelsAnalysis: "unknown",
      },
      { status: 500 }
    );
  }
}

// Function to extract text content from a website using ZenRows
async function extractWebsiteContent(website: string): Promise<string> {
  console.log(
    `🔍 [API:WebScraper] Starting extraction for website: ${website}`
  );

  // Make sure the website has a protocol
  const url = website.startsWith("http") ? website : `https://${website}`;
  console.log(`🔍 [API:WebScraper] Formatted URL: ${url}`);

  const client = new ZenRows(process.env.ZENROWS_API_KEY || "");
  console.log(`🔍 [API:WebScraper] ZenRows client initialized`);

  // Add retry logic with a maximum of 3 attempts
  const MAX_RETRIES = 3;
  const MIN_CONTENT_LENGTH = 500; // Minimum text length to consider valid

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `🔍 [API:WebScraper] Attempt ${attempt}/${MAX_RETRIES}: Sending request to ZenRows...`
      );
      const request = await client.get(url, {
        js_render: true,
        response_type: "plaintext",
        premium_proxy: true, // Use premium proxies for better results
        wait: 5000, // Wait 5 seconds for JS to execute (increased from default)
      });

      const data = await request.text();
      console.log(
        `✅ [API:WebScraper] Received ${data.length} characters of content`
      );

      // Check if we got a reasonable amount of content
      if (data.length >= MIN_CONTENT_LENGTH) {
        console.log(
          `✅ [API:WebScraper] Content sample: ${data.substring(0, 150)}...`
        );
        return data;
      } else {
        console.log(
          `⚠️ [API:WebScraper] Insufficient content length: ${data.length} characters is less than minimum ${MIN_CONTENT_LENGTH}`
        );

        if (attempt < MAX_RETRIES) {
          // Wait before retrying with increasing backoff
          const backoffMs = 2000 * attempt;
          console.log(
            `⏱️ [API:WebScraper] Waiting ${backoffMs}ms before next attempt...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    } catch (error) {
      console.error(`❌ [API:WebScraper] Error in attempt ${attempt}:`, error);

      if (attempt < MAX_RETRIES) {
        // Wait before retrying with increasing backoff
        const backoffMs = 2000 * attempt;
        console.log(
          `⏱️ [API:WebScraper] Waiting ${backoffMs}ms before next attempt...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // If we've exhausted all retries and still don't have good content,
  // try one last time with a different strategy - using wait for selector
  try {
    console.log(
      `🔍 [API:WebScraper] Final attempt: Using wait_for selector strategy...`
    );
    const request = await client.get(url, {
      js_render: true,
      response_type: "plaintext",
      premium_proxy: true,
      wait_for: "body", // Wait for body element to be loaded
      wait: 8000, // Wait longer
    });

    const data = await request.text();
    console.log(
      `✅ [API:WebScraper] Final attempt received ${data.length} characters of content`
    );
    console.log(
      `✅ [API:WebScraper] Content sample: ${data.substring(0, 150)}...`
    );

    return data;
  } catch (error) {
    console.error(`❌ [API:WebScraper] Final attempt also failed:`, error);
    // Return whatever we have, even if it's empty - the calling function will handle this
    return "Failed to extract content from website after multiple attempts.";
  }
}

// Function to analyze website content using OpenAI
async function analyzeWebsiteContent(websiteContent: string): Promise<{
  short_description: string;
  products_and_services: string[];
  business_model: string;
  has_online_checkout: string;
}> {
  console.log(
    `🧠 [API:AI Analysis] Starting analysis of ${websiteContent.length} characters of website content`
  );

  console.log(`🧠 [API:AI Analysis] Initializing OpenAI client`);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  });

  // Prepare the prompt with proper escaping
  const contentForPrompt = websiteContent.substring(0, 15000);
  console.log(
    `🧠 [API:AI Analysis] Prepared ${
      contentForPrompt.length
    } characters for prompt (truncated: ${websiteContent.length > 15000})`
  );

  const prompt = `Given the following complete text from a company's official website:

"""
${contentForPrompt} ${
    websiteContent.length > 15000 ? "... (content truncated)" : ""
  }
"""

Extract the following structured information in JSON format. If the information is explicitly available, provide it accurately; if it's unclear or unavailable explicitly, answer with "unknown":

{
  "short_description": "<Short (1-2 sentence) summary of the product or service offered by the business based on website content>",
  "products_and_services": ["<Product/Service 1>", "<Product/Service 2>", "..."],
  "business_model": "<B2B or B2C or Both or unclear>",
  "has_online_checkout": "<Yes or No>",
}
  

Please only return the JSON object, nothing else.
`;

  console.log(`🧠 [API:AI Analysis] Sending request to OpenAI...`);
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  console.log(`✅ [API:AI Analysis] Received response from OpenAI`);

  const content = response.choices[0]?.message.content || "";
  console.log(
    `✅ [API:AI Analysis] Response content: ${content.substring(0, 150)}...`
  );

  // Parse the JSON
  console.log(`🧠 [API:AI Analysis] Parsing JSON response`);
  const analysis = JSON.parse(content);

  console.log(`✅ [API:AI Analysis] Analysis complete`, analysis);

  revalidatePath("/");

  return {
    short_description: analysis.short_description || "unknown",
    products_and_services: Array.isArray(analysis.products_and_services)
      ? analysis.products_and_services
      : ["unknown"],
    business_model: analysis.business_model || "unknown",
    has_online_checkout: analysis.has_online_checkout || "unknown",
  };
}

// Function to analyze sales channels using Perplexity AI
async function analyzeSalesChannelsPerplexity(domain: string): Promise<string> {
  console.log(
    `🔄 [API:Perplexity] Starting sales channel analysis for domain: ${domain}`
  );

  const requestBody = {
    model: "sonar",
    messages: [
      {
        role: "system",
        content: "Be precise and concise.",
      },
      {
        role: "user",
        content: `What sales channels does this company use? ${domain}. Please write a brief bullet point list of the sales channels, max 5 items. Don't explain why, just list the channels, in plain text seperated by commas - nothing else. Don't use any formatting or newline symbols.`,
      },
    ],
  };

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorDetail = await response.text();
      console.error(`❌ [API:Perplexity] Failed request: ${errorDetail}`);
      throw new Error(`Perplexity API request failed: ${errorDetail}`);
    }

    const responseData = await response.json();
    const content = responseData.choices[0]?.message.content;

    if (!content) {
      throw new Error("No content returned from Perplexity API");
    }

    console.log(`✅ [API:Perplexity] Received analysis: ${content}`);

    return content;
  } catch (error) {
    console.error(`❌ [API:Perplexity] Error during analysis:`, error);
    return "unknown";
  }
}
