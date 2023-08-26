import React, { useEffect, useState } from 'react';
import * as CryptoJS from 'crypto-js';
import QRCode from 'qrcode.react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import InMemoryJwtManager from './CallAuth/InMemoryJwtManager';
import { UserMessages } from '../UserMessages/UserMessages';

interface RenderDataProps {
    data: BankIdAuth;
    orderTime: Date;
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
}

const RenderDataComponent: React.FC<RenderDataProps> = ({ data, orderTime }) => {
    const [qrData, setQrData] = useState('');
    const [, setQrTime] = useState(0);
    const [apiContent, setApiContent] = useState<ApiResponse | null>(null);
    const [hintCode, setHintCode] = useState<string | null>(null);
    const [userMessage, setUserMessage] = useState<string | null>(null);

    const getQrAuthCode = (qrStartSecret: string, time: number): string => {
        const keyByteArray = CryptoJS.enc.Utf8.parse(qrStartSecret);
        const hmac = CryptoJS.HmacSHA256(time.toString(), keyByteArray);
        return hmac.toString(CryptoJS.enc.Hex);
    };

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
                console.log(apiContent);
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
                    console.log(apiData);
                    const userMessage = UserMessages(apiData);
                    setUserMessage(userMessage);
                    setHintCode(apiData.hintCode ? apiData.hintCode : null);
                    setApiContent(apiData);
                    InMemoryJwtManager.setToken(apiData.token);
                })
                .catch(error => {
                    console.error('API request failed:', error);
                });
        }, 2000);

        return () => clearInterval(interval);
    }, [data, apiContent]);

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
                        {apiContent.status === 'complete' && apiContent.token ? (
                            <div>
                                <p>API Status: Success! Token: {apiContent.token}</p>
                                <p>Token: {InMemoryJwtManager.getToken()}</p>
                            </div>

                        ) : (
                            <p>API Status: {apiContent.status}</p>
                        )}
                        {hintCode &&
                            <p>Hint code: {hintCode}</p>
                        }
                        {userMessage &&
                            <p>User message: {userMessage}</p>
                        }

                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default RenderDataComponent;