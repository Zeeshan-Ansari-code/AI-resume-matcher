const formidable = require('formidable');
import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Extract-text API called');
  console.log('Request headers:', req.headers);
  console.log('Content-Type:', req.headers['content-type']);

  try {
    // Use formidable v2 syntax
    const form = new formidable.IncomingForm();
    form.maxFileSize = 10 * 1024 * 1024; // 10MB limit
    form.keepExtensions = true;
    form.allowEmptyFiles = false;

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable parsing error:', err);
          reject(err);
        } else {
          console.log('Formidable parsed successfully:', { fields, files });
          resolve([fields, files]);
        }
      });
    });

    console.log('Files received:', files);
    console.log('Fields received:', fields);

    // Check if files object exists and has the expected structure
    if (!files || !files.file) {
      console.error('No file in files object:', files);
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = files.file;
    
    // Handle both single file and array of files
    const fileToProcess = Array.isArray(file) ? file[0] : file;
    
    if (!fileToProcess) {
      console.error('No file to process:', file);
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file object
    if (!fileToProcess.filepath || !fileToProcess.originalFilename) {
      console.error('Invalid file object:', fileToProcess);
      return res.status(400).json({ error: 'Invalid file upload' });
    }

    const filePath = fileToProcess.filepath;
    const fileExtension = path.extname(fileToProcess.originalFilename || '').toLowerCase();
    
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      console.error('File does not exist at path:', filePath);
      return res.status(400).json({ error: 'Uploaded file not found' });
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    console.log('Processing file:', {
      fileName: fileToProcess.originalFilename,
      fileSize: stats.size,
      fileExtension: fileExtension,
      filePath: filePath
    });

    let extractedText = '';

    try {
      switch (fileExtension) {
        case '.pdf':
          console.log('Processing PDF file...');
          const pdfBuffer = fs.readFileSync(filePath);
          const pdfData = await pdf(pdfBuffer);
          extractedText = pdfData.text;
          console.log('PDF text extracted, length:', extractedText.length);
          break;

        case '.doc':
        case '.docx':
          console.log('Processing Word document...');
          const docBuffer = fs.readFileSync(filePath);
          const docResult = await mammoth.extractRawText({ buffer: docBuffer });
          extractedText = docResult.value;
          console.log('Word document text extracted, length:', extractedText.length);
          break;

        case '.txt':
          console.log('Processing text file...');
          extractedText = fs.readFileSync(filePath, 'utf-8');
          console.log('Text file content extracted, length:', extractedText.length);
          break;

        default:
          fs.unlinkSync(filePath);
          return res.status(400).json({ 
            error: `Unsupported file type: ${fileExtension}. Please upload PDF, DOC, DOCX, or TXT files.` 
          });
      }

      // Clean up the temporary file
      fs.unlinkSync(filePath);

      // Clean and format the extracted text
      extractedText = extractedText
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
        .trim();

      console.log('Text cleaned and formatted, final length:', extractedText.length);

      if (!extractedText || extractedText.length < 10) {
        return res.status(400).json({ 
          error: 'Could not extract meaningful text from the file. Please ensure the file contains readable text (minimum 10 characters).' 
        });
      }

      res.status(200).json({ 
        text: extractedText,
        fileType: fileExtension,
        fileName: fileToProcess.originalFilename,
        textLength: extractedText.length
      });

    } catch (extractError) {
      // Clean up the temporary file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      console.error('Text extraction error:', extractError);
      console.error('Error details:', {
        message: extractError.message,
        stack: extractError.stack,
        fileName: fileToProcess.originalFilename,
        fileExtension: fileExtension
      });

      let errorMessage = 'Failed to extract text from file.';
      
      if (extractError.message.includes('password')) {
        errorMessage = 'The file appears to be password-protected. Please remove the password and try again.';
      } else if (extractError.message.includes('corrupted')) {
        errorMessage = 'The file appears to be corrupted. Please try uploading a different copy.';
      } else if (extractError.message.includes('mammoth')) {
        errorMessage = 'Failed to process Word document. The file might be corrupted or in an unsupported format.';
      } else if (extractError.message.includes('pdf')) {
        errorMessage = 'Failed to process PDF. The file might be corrupted, password-protected, or contain only images.';
      }

      return res.status(500).json({ 
        error: errorMessage,
        details: extractError.message
      });
    }

  } catch (error) {
    console.error('File processing error:', error);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'Failed to process uploaded file. Please try again.';
    
    if (error.message.includes('maxFileSize')) {
      errorMessage = 'File size exceeds the 10MB limit. Please upload a smaller file.';
    } else if (error.message.includes('mimetype')) {
      errorMessage = 'File type not supported. Please upload PDF, DOC, DOCX, or TXT files.';
    }

    res.status(500).json({ 
      error: errorMessage,
      details: error.message
    });
  }
}
