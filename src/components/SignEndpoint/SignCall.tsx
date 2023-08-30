import { useState, useEffect } from 'react';
//import RenderDataComponent from './RenderDataComponent';
import Navbar from '../Navbar/Navbar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import "./../../CustomStyles/Bootstrap.css"




const SignCall = () => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [accept, setAccept] = useState<boolean>(false);


  useEffect(() => {
    fetch('https://localhost:7080/api/Sign')
      .then(response => response.blob())
      .then(blob => setPdfBlob(blob))
      .catch(error => {
        console.error('Error fetching PDF file:', error);
      });
  }, []);

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
    if(accept === true)
    {
      setAccept(false)
    }
    else
    {
      setAccept(true)
    }
  }

  return (
    <>
      <Navbar />
      <div>
        <Container>
          <Row>
            <Col >
              <Button variant="primary" size="lg"  active onClick={handleDownload}>View file</Button>
            </Col>
           <div style={{float:"right"}}>
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
      </div>
    </>
  );
};





export default SignCall;