import { useState, useEffect } from 'react';
import Navbar from '../Navbar/Navbar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import "./../../CustomStyles/Bootstrap.css"
import { pdfjs, Document } from 'react-pdf';
import RenderDataComponentSigner from './RenderDataComponentSigner';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.js`;

interface BankIdAuth {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

interface PdfMetadata {
  Author: string;
  CreationDate: string;
  Creator: string;
  EncryptFilterName: string | null;
  IsAcroFormPresent: boolean;
  IsCollectionPresent: boolean;
  IsLinearized: boolean;
  IsSignaturesPresent: boolean;
  IsXFAPresent: boolean;
  Language: string;
  ModDate: string;
  PDFFormatVersion: string;
  Producer: string;
}

const SignCall = () => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [accept, setAccept] = useState<boolean>(false);
  const [metadata, setMetadata] = useState(null);
  const [userVisibleData, setUserVisibleData] = useState(null);
  const [data, setData] = useState<BankIdAuth>({ orderRef: '', autoStartToken: '', qrStartToken: '', qrStartSecret: '' } as BankIdAuth);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleDownload = () => {
    if (pdfBlob) {
      // Create a URL for the blob
      const blobURL = URL.createObjectURL(pdfBlob);
      // Open a new window with the PDF blob URL
      window.open(blobURL, '_blank');
      // Clean up the blob URL
      URL.revokeObjectURL(blobURL);
    }
  };

  const handleAccept = () => {
    if (accept === true)
      setAccept(false)
    else
      setAccept(true)
  }

  const parsePdfMetadata = (metadata: any): PdfMetadata => {
    return {
      Author: metadata.Author,
      CreationDate: metadata.CreationDate,
      Creator: metadata.Creator,
      EncryptFilterName: metadata.EncryptFilterName,
      IsAcroFormPresent: metadata.IsAcroFormPresent,
      IsCollectionPresent: metadata.IsCollectionPresent,
      IsLinearized: metadata.IsLinearized,
      IsSignaturesPresent: metadata.IsSignaturesPresent,
      IsXFAPresent: metadata.IsXFAPresent,
      Language: metadata.Language,
      ModDate: metadata.ModDate,
      PDFFormatVersion: metadata.PDFFormatVersion,
      Producer: metadata.Producer,
    };
  };


  const fetchData = async () => {


    try {
      const request = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endUserIp: '192.168.0.1', userVisibleData: userVisibleData, userVisibleDataFormat: "simpleMarkdownV1" }),
      };
      const response = await fetch('https://localhost:7080/api/Sign', request);

      const responseData = await response.json();
      if (response.ok) {
        //console.log(responseData)
      }


      setData(responseData);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const onDocumentLoadSuccess = async (pdf: any) => {
    setMetadata(await pdf.getMetadata());
  }

  useEffect(() => {
    if (metadata) {
      const parsedMetadata = parsePdfMetadata(metadata.info);

      const message = `# Overview
      By signing this document, you agree to the following contents of the document:
      
      ## Document metadata
      
      *Author*

      + ${parsedMetadata.Author}.

      *Creation date*

      + ${parsedMetadata.CreationDate}.

      *Language*

      + ${parsedMetadata.Language}.

      *Modification date*

      + ${parsedMetadata.ModDate}.

      ---
      Have a nice day!
      ---`;


      const encodedToBase64 = btoa(message)
      setUserVisibleData(encodedToBase64)
    }
  }, [metadata])

  useEffect(() => {
    if (userVisibleData && accept) {
      fetchData();
    }
  }, [userVisibleData, accept])


  const handlePdfChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files && event.target.files[0];

    if (selectedFile) {
      setPdfBlob(selectedFile);
      setSelectedPdf(selectedFile);

      // Read the contents of the selected file and display as a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        // Use the reader.result to display the PDF preview
        // For example, you can set it in state and render an <embed> or <iframe> tag
        const pdfPreviewUrl = reader.result as string;
        setPdfUrl(pdfPreviewUrl);
      };
      reader.readAsDataURL(selectedFile);
    }
  };


  return (
    <>
      <Navbar />
      <Container>

        <Row>
          <Col>

            <Form.Group controlId='formFile' className='mb-3'>
              <Form.Label>Upload PDF</Form.Label>
              <Form.Control type='file' accept=".pdf" onChange={handlePdfChange} />
            </Form.Group>

            {selectedPdf && pdfUrl && pdfBlob && (
              <div>
                <Document file={pdfBlob} onLoadSuccess={onDocumentLoadSuccess}>
                </Document>
              </div>
            )}
          </Col>
        </Row>
      </Container>

      <div>
        <Container>
          <Row>
            <Col >
              <Button variant="primary" size="lg" active onClick={handleDownload}>View file</Button>
            </Col>
            <div style={{ float: "right" }}>
              Accept the contents of the file to sign it
            </div>
            <Col>
            </Col>
          </Row>
          <Row className='mt-3'>
            <Col>
              <Form.Check
                checked={accept}
                bsPrefix='form-check-input[type="checkbox"]]'
                onChange={handleAccept}
                type='checkbox'
                className='mb-3 border-dark'
                label="Check to accept the contents of the document"
              />
            </Col>
          </Row>
        </Container>
        {
          data && accept && pdfBlob &&
          <div style={{ wordBreak: "break-word" }}>
            <RenderDataComponentSigner pdf={pdfBlob} data={data} orderTime={new Date()} />
          </div>
        }
      </div>
    </>
  );
};

export default SignCall;