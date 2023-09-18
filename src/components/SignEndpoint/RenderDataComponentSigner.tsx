import React, { useEffect, useState } from 'react';
import * as CryptoJS from 'crypto-js';
import QRCode from 'qrcode.react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { UserMessages } from '../UserMessages/UserMessages';

interface RenderDataProps {
    data: BankIdAuth;
    orderTime: Date;
    pdf: Blob;
}

interface ResponseObject {
    completionData: completionData;
}

interface completionData {
    bankIdIssueData: Date;
    ocspResponse: string;
    signature: string;
    user: userData;
}

interface userData {
    givenName: string;
    name: string;
    personalNumber: string;
    surname: string;
}

interface BankIdAuth {
    orderRef: string;
    autoStartToken: string;
    qrStartToken: string;
    qrStartSecret: string;
}

interface ApiResponse {
    orderRef: string;
    status: 'pending' | 'failed' | 'complete';
    hintCode?: string;
    token?: string; // Adding the token property for success
    errorCode?: string;
    response: ResponseObject;
}

const RenderDataComponentSigner: React.FC<RenderDataProps> = ({ data, orderTime, pdf }) => {
    const [qrData, setQrData] = useState('');
    const [, setQrTime] = useState(0);
    const [apiContent, setApiContent] = useState<ApiResponse | null>(null);
    const [hintCode, setHintCode] = useState<string | null>(null);
    const [userMessage, setUserMessage] = useState<string | null>(null);
    const [fileUpload, setFileUpload] = useState<boolean>(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [location, setLocation] = useState<object | null>(null);

    const getQrAuthCode = (qrStartSecret: string, time: number): string => {
        const keyByteArray = CryptoJS.enc.Utf8.parse(qrStartSecret);
        const hmac = CryptoJS.HmacSHA256(time.toString(), keyByteArray);
        return hmac.toString(CryptoJS.enc.Hex);
    };

    const openPdf = () => {
        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        }
    }

    const downloadPdf = () => {
        if (pdfUrl) {
            const blobUrl = pdfUrl;
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'file.pdf';
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(blobUrl);
        }
    }

    useEffect(() => {
        const updateQRData = () => {
            const orderTimes = orderTime;
            const newQrTime = Math.floor((new Date().getTime() - orderTimes.getTime()) / 1000);
            setQrTime(newQrTime);

            const qrAuthCode = getQrAuthCode(data.qrStartSecret, newQrTime);

            const qrData = `bankid.${data.qrStartToken}.${newQrTime}.${qrAuthCode}`;
            setQrData(qrData);
        };

        updateQRData();
    }, [data, orderTime]);



    useEffect(() => {
        const interval = setInterval(() => {
            if (apiContent && (apiContent.status === 'failed' || apiContent.status === 'complete')) {
                //console.log(apiContent);
                clearInterval(interval);
                return;
            }

            fetch('https://localhost:7080/api/Collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderRef: data.orderRef }),
            })
                .then(response => response.json())
                .then(apiData => {
                    //console.log(apiData);
                    getGeoLocation();
                    const userMessage = UserMessages(apiData);
                    setUserMessage(userMessage);
                    setHintCode(apiData.hintCode ? apiData.hintCode : null);
                    setApiContent(apiData);
                    //InMemoryJwtManager.setToken(apiData.token);
                })
                .catch(error => {
                    console.error('API request failed:', error);
                });
        }, 2000);

        return () => clearInterval(interval);
    }, [data, apiContent]);


    useEffect(() => {
        // TODO: Replace 'status' with the actual property name from your API response
        if (apiContent && apiContent.status === 'complete' && pdf && !fileUpload) {
            let user = apiContent.response.completionData.user;
            let form = new FormData();

            if (location != null) {
                console.log(location)
            }
            form.append("file", pdf);
            form.append("user", JSON.stringify(user))
            fetch('https://localhost:7080/api/Sign/upload', {
                method: 'POST',
                body: form,
            })
                .then(response => {
                    // Handle binary data here
                    if (!response.ok) {
                        console.log(response);
                    }
                    return response.blob(); // This retrieves the binary data
                })
                .then(blobData => {
                    // Handle the binary data as needed, e.g., displaying or downloading the PDF
                    // You can set it in state or use it directly
                    // For example, if you want to display it in a new window:
                    const pdfURL = URL.createObjectURL(blobData);
                    //window.open(pdfURL, '_blank');
                    setPdfUrl(pdfURL);
                    setFileUpload(true);
                })
                .catch(error => {
                    console.error('API request failed:', error);
                });
        }
    }, [pdf, apiContent, fileUpload]);

    const showPosition = (position: any) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;


        const location: {
            latitude: number;
            longitude: number;
        } = {
            latitude: lat,
            longitude: lon,
        }

        setLocation(location);
    }

    const errorLocation = (() => {
        console.log("Error getting location");
    })


    const getGeoLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, errorLocation);
        }
        else {
            alert("Geolocation is not supported by this browser.");
        }
    }



    const startFromFile = () => {
        const url = `bankid:///?autostarttoken=${data.autoStartToken}&redirect=${encodeURIComponent('http://127.0.0.1:5173/')}`;
        window.location.href = url;
    };





    return (
        <Container>
            <Row>
                <Col>
                    <p>Generated QR Data:</p>
                    <QRCode value={qrData} />
                </Col>
            </Row>
            <Row>
                <Col>
                    <Button variant="primary" onClick={startFromFile}>
                        Login from file
                    </Button>
                </Col>
            </Row>
            {apiContent && (
                <Row>
                    <Col>
                        {apiContent.status === 'complete' && apiContent.token &&
                            <div>
                                <p>API Status: Success!</p>
                            </div>

                        }
                        {hintCode &&
                            <p>Hint code: {hintCode}</p>
                        }
                        {userMessage &&
                            <p>User message: {userMessage}</p>
                        }

                    </Col>
                </Row>
            )}

            {pdfUrl &&
                <div>
                    <Row>
                        <Col>
                            <Button variant="primary" onClick={openPdf}>
                                Open File
                            </Button>

                        </Col>
                        <Col>
                            <Button variant="primary" onClick={downloadPdf}>
                                Download File
                            </Button>

                        </Col>
                    </Row>
                </div>
            }
        </Container>
    );
};

export default RenderDataComponentSigner;