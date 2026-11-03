import { useState } from 'react';

export default function Setup({ onSetupComplete }) {
    const [file, setFile] = useState(null);
    const [jd, setJd] = useState('');
    const [githubUsername, setGithubUsername] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (!file || !jd.trim()) {
            setError("Please provide both a resume PDF and a job description.");
            return;
        }

        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append("resume", file);
        formData.append("jd", jd);
        // Append the new GitHub username field
        formData.append("github_username", githubUsername.trim());

        try {
            const response = await fetch("http://localhost:8000/upload-context", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                onSetupComplete();
            } else {
                const data = await response.json();
                setError(data.message || "Upload failed. Please try again.");
            }
        } catch (err) {
            setError("Server connection failed. Is your backend running?");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <style>
                {`
                .premium-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.1); }
                .premium-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-weight: 600; letter-spacing: 0.5px; }
                .premium-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(15, 23, 42, 0.25); }
                .premium-btn:active:not(:disabled) { transform: translateY(0px); }
                .premium-btn:disabled { opacity: 0.7; cursor: not-allowed; }
                .file-drop:hover { border-color: #0f172a; background-color: #f8fafc; }
                `}
            </style>

            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                width: '100%',
                maxWidth: '650px',
                padding: '48px',
                border: '1px solid rgba(255,255,255,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
                        width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#0f172a', 
                        color: 'white', marginBottom: '20px' 
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                    </div>
                    <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '32px', letterSpacing: '-0.5px', fontWeight: '700' }}>System Initialization</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>Provide candidate context to configure the AI agent.</p>
                </div>

                <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    
                    {/* Resume Upload */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#1e293b', fontWeight: '600', fontSize: '14px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', fontSize: '12px' }}>1</span>
                            Upload Resume (PDF)
                        </label>
                        <div className="file-drop" style={{
                            position: 'relative', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '32px 20px', 
                            textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', backgroundColor: '#ffffff'
                        }}>
                            <input 
                                type="file" 
                                accept="application/pdf" 
                                onChange={handleFileChange}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            />
                            <div style={{ color: file ? '#0f172a' : '#64748b', fontWeight: '500' }}>
                                {file ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        {file.name}
                                    </span>
                                ) : "Click or drag your PDF resume here"}
                            </div>
                        </div>
                    </div>

                    {/* GitHub Username */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#1e293b', fontWeight: '600', fontSize: '14px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', fontSize: '12px' }}>2</span>
                            GitHub Username <span style={{ color: '#94a3b8', fontWeight: '400' }}>(Agentic Target)</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <svg style={{ position: 'absolute', left: '16px', top: '16px', color: '#94a3b8' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                            <input 
                                type="text"
                                className="premium-input"
                                value={githubUsername}
                                onChange={(e) => setGithubUsername(e.target.value)}
                                placeholder="e.g. abinanil000datascience"
                                style={{
                                    width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px',
                                    border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a',
                                    fontSize: '15px', transition: 'all 0.3s ease', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </div>

                    {/* Job Description */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#1e293b', fontWeight: '600', fontSize: '14px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', fontSize: '12px' }}>3</span>
                            Job Description
                        </label>
                        <textarea 
                            className="premium-input"
                            value={jd} 
                            onChange={(e) => setJd(e.target.value)} 
                            placeholder="Paste the target role responsibilities and requirements here..."
                            style={{
                                width: '100%', minHeight: '140px', padding: '16px', borderRadius: '16px',
                                border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a',
                                fontSize: '15px', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#ef4444', fontSize: '14px', textAlign: 'center', fontWeight: '500' }}>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isUploading}
                        className="premium-btn"
                        style={{
                            width: '100%', padding: '18px', backgroundColor: '#0f172a', color: 'white',
                            border: 'none', borderRadius: '16px', fontSize: '16px', marginTop: '8px',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px'
                        }}
                    >
                        {isUploading ? (
                            <>
                                <span style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                Initializing Architecture...
                            </>
                        ) : "Deploy AI Interviewer"}
                    </button>
                </form>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}