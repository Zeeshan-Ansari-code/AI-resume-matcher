import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { resume, jobDesc } = req.body;

  if (!resume || !jobDesc) {
    return res.status(400).json({ error: "Resume and job description are required" });
  }

  try {
    let score = 0;
    let hfError = null;

    // 1. Try Hugging Face Similarity Score
    try {
      const hfResp = await axios.post(
        "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
        { inputs: { source_sentence: resume, sentences: [jobDesc] } },
        { headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` } }
      );
      const similarity = hfResp.data[0];
      score = Math.round(similarity * 100);
      console.log('Hugging Face similarity score:', score);
    } catch (hfErr) {
      console.error('Hugging Face API error:', hfErr.response?.data || hfErr.message);
      hfError = hfErr.response?.data?.error || hfErr.message;
      
      // Fallback: Calculate a basic similarity score using word overlap
      const resumeWords = new Set(resume.toLowerCase().split(/\s+/).filter(word => word.length > 2));
      const jobWords = new Set(jobDesc.toLowerCase().split(/\s+/).filter(word => word.length > 2));
      
      const commonWords = [...resumeWords].filter(word => jobWords.has(word));
      const totalUniqueWords = new Set([...resumeWords, ...jobWords]);
      
      score = Math.round((commonWords.length / totalUniqueWords.size) * 100);
      console.log('Fallback similarity score:', score, 'using word overlap method');
    }

    // 2. Enhanced AI Analysis with Gemini for better suggestions
    let analysis = "Analysis not available.";
    let suggestions = "Suggestions not available.";
    let actionItems = "Action items not available.";
    let missingKeywords = [];
    let geminiError = null;

    try {
      const geminiPrompt = `Analyze this resume against the job description and provide comprehensive feedback.

Resume:
${resume}

Job Description:
${jobDesc}

Please provide a detailed analysis in the following format:

RESUME ANALYSIS:
- Overall match quality: [Excellent/Good/Fair/Poor]
- Key strengths: [List 3-5 strengths]
- Areas for improvement: [List 3-5 specific improvements]

DETAILED SUGGESTIONS:
- Content improvements: [Specific suggestions for resume content]
- Format improvements: [Suggestions for resume structure/layout]
- Skill highlighting: [How to better showcase relevant skills]

MISSING KEYWORDS: [keyword1, keyword2, keyword3, ...]

ACTION ITEMS:
- Immediate actions: [What to do right away]
- Long-term improvements: [What to work on over time]

Be specific, actionable, and professional in your feedback.`;

const geminiResp = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: geminiPrompt
            }
          ]
        }
      ]
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

      const responseText = geminiResp.data.candidates[0].content.parts[0].text;

      // Enhanced parsing with better structure
      const analysisMatch = responseText.match(/RESUME ANALYSIS:(.*?)(DETAILED SUGGESTIONS:|$)/s);
      const suggestionsMatch = responseText.match(/DETAILED SUGGESTIONS:(.*?)(MISSING KEYWORDS:|$)/s);
      const keywordsMatch = responseText.match(/MISSING KEYWORDS:\s*(.*?)(\n|$)/s);
      const actionItemsMatch = responseText.match(/ACTION ITEMS:(.*?)(\n|$)/s);

      // Extract and clean the parsed content
      analysis = analysisMatch ? analysisMatch[1].trim() : "Analysis not available.";
      suggestions = suggestionsMatch ? suggestionsMatch[1].trim() : "Suggestions not available.";
      missingKeywords = keywordsMatch 
        ? keywordsMatch[1].replace(/\[|\]/g, "").split(",").map(k => k.trim()).filter(k => k)
        : [];
      actionItems = actionItemsMatch ? actionItemsMatch[1].trim() : "Action items not available.";

      console.log('Gemini analysis successful');
    } catch (geminiErr) {
      console.error('Gemini API error:', geminiErr.response?.data || geminiErr.message);
      geminiError = geminiErr.response?.data?.error || geminiErr.message;
      
      // Fallback: Generate basic analysis using local logic
      console.log('Using fallback analysis logic');
      
      // Basic keyword extraction
      const resumeWords = resume.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      const jobWords = jobDesc.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      
      const resumeWordFreq = {};
      const jobWordFreq = {};
      
      resumeWords.forEach(word => {
        resumeWordFreq[word] = (resumeWordFreq[word] || 0) + 1;
      });
      
      jobWords.forEach(word => {
        jobWordFreq[word] = (jobWordFreq[word] || 0) + 1;
      });
      
      // Find missing keywords
      const missing = Object.keys(jobWordFreq).filter(word => !resumeWordFreq[word]);
      missingKeywords = missing.slice(0, 10); // Top 10 missing keywords
      
      // Generate fallback analysis
      analysis = `Based on word overlap analysis, your resume has a ${score}% match with the job description. 
      
Key observations:
- Resume word count: ${resumeWords.length}
- Job description word count: ${jobWords.length}
- Common keywords: ${Object.keys(resumeWordFreq).filter(word => jobWordFreq[word]).slice(0, 5).join(', ')}`;

      suggestions = `Improvement suggestions:
- Add missing keywords: ${missingKeywords.slice(0, 5).join(', ')}
- Ensure your resume highlights relevant experience
- Use industry-specific terminology from the job description
- Quantify achievements where possible`;

      actionItems = `Immediate actions:
- Review and incorporate missing keywords
- Align resume language with job description
- Highlight relevant skills and experience
- Consider adding specific examples that match job requirements`;
    }

    // Calculate additional metrics
    const wordCount = resume.split(/\s+/).length;
    const jobWordCount = jobDesc.split(/\s+/).length;
    const keywordDensity = missingKeywords.length > 0 ? Math.max(0, 100 - (missingKeywords.length * 10)) : 100;

    // Enhanced response with more detailed information
    res.json({
      score,
      analysis: {
        overall: analysis,
        suggestions: suggestions,
        actionItems: actionItems
      },
      missingKeywords,
      metrics: {
        resumeWordCount: wordCount,
        jobDescriptionWordCount: jobWordCount,
        keywordDensity: keywordDensity,
        similarityScore: score
      },
      recommendations: {
        priority: score < 50 ? "High" : score < 75 ? "Medium" : "Low",
        estimatedImprovement: Math.max(0, 100 - score),
        focusAreas: missingKeywords.slice(0, 5) // Top 5 missing keywords to focus on
      },
      warnings: [
        ...(hfError ? [`Hugging Face API: ${hfError}. Using fallback scoring method.`] : []),
        ...(geminiError ? [`Gemini API: ${geminiError}. Using fallback analysis method.`] : [])
      ].filter(Boolean)
    });

  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    
    // Provide fallback analysis if external APIs fail
    if (error.response?.status === 401) {
      return res.status(500).json({ 
        error: "API authentication failed. Please check your API keys.",
        fallback: {
          score: Math.floor(Math.random() * 40) + 30, // Fallback score
          suggestions: "Unable to generate AI suggestions due to API issues. Please ensure your resume highlights relevant skills and experience.",
          missingKeywords: ["API unavailable"]
        }
      });
    }
    
    res.status(500).json({ 
      error: "Analysis failed. Please try again later.",
      details: error.message
    });
  }
}
