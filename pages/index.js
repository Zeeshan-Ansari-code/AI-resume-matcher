import { useState, useRef } from "react";
import axios from "axios";

export default function Home() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescText, setJobDescText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  
  const resumeInputRef = useRef();

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      setError(`Please upload a valid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    setExtracting(true);
    setError("");
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/extract-text', formData);
      setResumeText(response.data.text);
      setResumeFile(file);
      console.log('Text extraction successful:', {
        fileName: file.name,
        textLength: response.data.textLength,
        fileType: response.data.fileType
      });
    } catch (err) {
      console.error('Text extraction error:', err);
      
      let errorMessage = 'Failed to extract text from file. Please try again.';
      
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 413) {
        errorMessage = 'File is too large. Please upload a file smaller than 10MB.';
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data.error || 'Invalid file format or empty file.';
      } else if (err.response?.status === 500) {
        errorMessage = err.response.data.error || 'Server error during text extraction.';
      }
      
      setError(errorMessage);
    }
    
    setExtracting(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleSubmit = async () => {
    if (!resumeText.trim() || !jobDescText.trim()) {
      setError('Please upload a resume file and enter a job description.');
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await axios.post("/api/match", { 
        resume: resumeText, 
        jobDesc: jobDescText 
      });
      setResult(res.data);
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
      console.error(err);
    }
    
    setLoading(false);
  };

  const clearAll = () => {
    setResumeFile(null);
    setResumeText("");
    setJobDescText("");
    setResult(null);
    setError("");
    if (resumeInputRef.current) resumeInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          AI Resume Matcher
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Upload your resume and enter job description to get AI-powered matching analysis
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Resume Upload */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Resume Upload</h2>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                resumeFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {resumeFile ? (
                <div className="text-green-700">
                  <p className="font-medium">✓ {resumeFile.name}</p>
                  <p className="text-sm mt-2">Text extracted successfully</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">Drag & drop your resume here</p>
                  <p className="text-sm text-gray-500 mb-4">or</p>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => resumeInputRef.current?.click()}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Choose File
                  </button>
                  <p className="text-xs text-gray-500 mt-2">PDF, DOC, DOCX, TXT</p>
                </div>
              )}
            </div>
            {extracting && resumeFile && (
              <p className="text-blue-600 text-sm mt-2 text-center">Extracting text...</p>
            )}
          </div>

          {/* Job Description Text Input */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Job Description</h2>
            <div className="space-y-4">
              <textarea
                className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Paste or type the job description here..."
                value={jobDescText}
                onChange={(e) => setJobDescText(e.target.value)}
              />
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Characters: {jobDescText.length}</span>
                <span>Words: {jobDescText.trim() ? jobDescText.trim().split(/\s+/).length : 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={handleSubmit}
            disabled={!resumeText.trim() || !jobDescText.trim() || loading}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              !resumeText.trim() || !jobDescText.trim() || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? "Analyzing..." : "Analyze Match"}
          </button>
          
          <button
            onClick={clearAll}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Warnings Display */}
        {result?.warnings && result.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-6">
            <div className="text-center mb-2">
              <span className="font-medium">⚠️ API Warnings:</span>
            </div>
            <div className="space-y-2">
              {result.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-center">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Match Analysis Complete
              </h2>
              <div className="inline-flex items-center px-6 py-3 bg-blue-100 text-blue-800 rounded-full">
                <span className="text-3xl font-bold">{result.score}%</span>
                <span className="ml-2 text-lg">Match Score</span>
              </div>
            </div>

            {/* Metrics Dashboard */}
            {result.metrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Resume Words</p>
                  <p className="text-lg font-semibold">{result.metrics.resumeWordCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">JD Words</p>
                  <p className="text-lg font-semibold">{result.metrics.jobDescriptionWordCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Keyword Density</p>
                  <p className="text-lg font-semibold">{result.metrics.keywordDensity}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Priority</p>
                  <p className={`text-lg font-semibold ${
                    result.recommendations?.priority === 'High' ? 'text-red-600' :
                    result.recommendations?.priority === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {result.recommendations?.priority || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Main Analysis Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Resume Analysis */}
              {result.analysis?.overall && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Resume Analysis</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-line text-gray-700">{result.analysis.overall}</p>
                  </div>
                </div>
              )}

              {/* Detailed Suggestions */}
              {result.analysis?.suggestions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Detailed Suggestions</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-line text-gray-700">{result.analysis.suggestions}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Items */}
            {result.analysis?.actionItems && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Action Items</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="whitespace-pre-line text-gray-700">{result.analysis.actionItems}</p>
                </div>
              </div>
            )}

            {/* Missing Keywords */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Missing Keywords & Skills</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {result.missingKeywords && result.missingKeywords.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-3">Focus on these keywords to improve your match:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.missingKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    {result.recommendations?.focusAreas && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Top priorities:</strong> {result.recommendations.focusAreas.slice(0, 3).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-green-600 font-medium">🎉 No missing keywords found! Your resume covers the job requirements well.</p>
                )}
              </div>
            </div>

            {/* Recommendations Summary */}
            {result.recommendations && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Quick Summary</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Priority Level:</p>
                    <p className="font-semibold text-gray-800">{result.recommendations.priority}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Improvement Potential:</p>
                    <p className="font-semibold text-gray-800">+{result.recommendations.estimatedImprovement}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Focus Areas:</p>
                    <p className="font-semibold text-gray-800">{result.recommendations.focusAreas.length} keywords</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
