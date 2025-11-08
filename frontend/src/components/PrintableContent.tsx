import React from 'react';

interface PrintableContentProps {
  result: any;
  title: string;
}

const PrintableContent: React.FC<PrintableContentProps> = ({ result, title }) => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Times New Roman', color: 'black', backgroundColor: 'white' }}>
      <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '30px' }}>{title}</h1>

      <Section title="Parte Introductivă">
        <p>{result.data?.parte_introductiva || 'N/A'}</p>
      </Section>

      <Section title="Considerente Speță">
        <p>{result.data?.considerente || 'N/A'}</p>
      </Section>

      <Section title="Dispozitiv Speță">
        <p>{result.data?.dispozitiv || 'N/A'}</p>
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '25px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', borderBottom: '2px solid #ccc', paddingBottom: '5px' }}>
      {title}
    </h2>
    <div style={{ fontSize: '16px', lineHeight: '1.6' }}>
      {children}
    </div>
  </div>
);

export default PrintableContent;
