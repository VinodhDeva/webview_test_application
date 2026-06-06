import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTheme, setActiveTheme] = useState('cyberviolet');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [telemetryVal, setTelemetryVal] = useState(68);
  const [isClosed, setIsClosed] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [postMessageLogs, setPostMessageLogs] = useState([]);
  const [systemTime, setSystemTime] = useState('');
  const [activeCodeTab, setActiveCodeTab] = useState('kotlin');
  const [copiedState, setCopiedState] = useState(false);

  // Update real-time system clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync theme changes with body element classes
  useEffect(() => {
    // Remove existing theme classes
    document.body.classList.remove('theme-cyberviolet', 'theme-sunsetamber', 'theme-emeraldaurora', 'theme-oceanicwave');
    // Add active theme class
    document.body.classList.add(`theme-${activeTheme}`);
  }, [activeTheme]);

  // Sync light/dark mode preference
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Handle Close Webview event
  const handleClosePortal = () => {
    const timestamp = new Date().toISOString();
    const logs = [];

    // Trigger visual collapse sequence
    setIsCollapsing(true);

    // 1. PostMessage to parent frame (standard iframe/webview bridge)
    const standardPayload = {
      event: 'webview:close',
      sender: 'AetherPortal',
      theme: activeTheme,
      telemetry: telemetryVal,
      timestamp: timestamp
    };
    try {
      window.parent.postMessage(standardPayload, '*');
      logs.push({
        bridge: 'window.parent.postMessage',
        payload: JSON.stringify(standardPayload),
        status: 'Sent'
      });
    } catch (e) {
      logs.push({
        bridge: 'window.parent.postMessage',
        payload: 'Failed to serialise payload',
        status: 'Error'
      });
    }

    // 2. Windows / Edge WebView2 Bridge
    if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
      try {
        window.chrome.webview.postMessage(standardPayload);
        logs.push({
          bridge: 'window.chrome.webview.postMessage',
          payload: JSON.stringify({ action: 'close' }),
          status: 'Dispatched'
        });
      } catch (e) {
        logs.push({
          bridge: 'window.chrome.webview',
          payload: e.message,
          status: 'Error'
        });
      }
    } else {
      logs.push({
        bridge: 'window.chrome.webview',
        payload: 'Bridge not detected in environment',
        status: 'Bypassed'
      });
    }

    // 3. iOS Apple WebKit / WKWebView Bridge (supports multiple handler names)
    let iosDispatched = false;
    if (window.webkit && window.webkit.messageHandlers) {
      if (window.webkit.messageHandlers.close) {
        try {
          window.webkit.messageHandlers.close.postMessage(standardPayload);
          logs.push({
            bridge: 'window.webkit.messageHandlers.close.postMessage',
            payload: JSON.stringify(standardPayload),
            status: 'Dispatched'
          });
          iosDispatched = true;
        } catch (e) {
          logs.push({
            bridge: 'window.webkit.messageHandlers.close',
            payload: e.message,
            status: 'Error'
          });
        }
      }
      if (window.webkit.messageHandlers.closeWebview) {
        try {
          window.webkit.messageHandlers.closeWebview.postMessage(standardPayload);
          logs.push({
            bridge: 'window.webkit.messageHandlers.closeWebview.postMessage',
            payload: JSON.stringify(standardPayload),
            status: 'Dispatched'
          });
          iosDispatched = true;
        } catch (e) {
          logs.push({
            bridge: 'window.webkit.messageHandlers.closeWebview',
            payload: e.message,
            status: 'Error'
          });
        }
      }
    }

    if (!iosDispatched) {
      logs.push({
        bridge: 'window.webkit.messageHandlers',
        payload: 'Bridge (close/closeWebview) not detected',
        status: 'Bypassed'
      });
    }

    // 4. Android native WebAppInterface Bridge (supports standard 'close()' and 'closeWebview()')
    let androidDispatched = false;
    if (window.Android) {
      if (typeof window.Android.close === 'function') {
        try {
          window.Android.close();
          logs.push({
            bridge: 'window.Android.close()',
            payload: 'void',
            status: 'Executed'
          });
          androidDispatched = true;
        } catch (e) {
          logs.push({
            bridge: 'window.Android.close',
            payload: e.message,
            status: 'Error'
          });
        }
      }
      if (typeof window.Android.closeWebview === 'function') {
        try {
          window.Android.closeWebview();
          logs.push({
            bridge: 'window.Android.closeWebview()',
            payload: 'void',
            status: 'Executed'
          });
          androidDispatched = true;
        } catch (e) {
          logs.push({
            bridge: 'window.Android.closeWebview',
            payload: e.message,
            status: 'Error'
          });
        }
      }
    }

    if (!androidDispatched) {
      logs.push({
        bridge: 'window.Android',
        payload: 'Bridge (close/closeWebview) not detected',
        status: 'Bypassed'
      });
    }

    setPostMessageLogs(logs);

    // Transition state after visual collapse animation finishes (500ms)
    setTimeout(() => {
      setIsClosed(true);
      setIsCollapsing(false);
    }, 500);
  };

  const codeSnippets = {
    kotlin: `package com.example.webview

import android.app.Activity
import android.webkit.JavascriptInterface

class WebAppInterface(private val activity: Activity) {
    /** Closes the Activity housing the WebView */
    @JavascriptInterface
    fun closeWebview() {
        activity.runOnUiThread {
            activity.finish()
        }
    }
}

// In your Activity/Fragment setup:
webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(WebAppInterface(this), "Android")`,
    java: `package com.example.webview;

import android.app.Activity;
import android.webkit.JavascriptInterface;

public class WebAppInterface {
    private Activity activity;

    public WebAppInterface(Activity activity) {
        this.activity = activity;
    }

    /** Closes the Activity housing the WebView */
    @JavascriptInterface
    public void closeWebview() {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                activity.finish();
            }
        });
    }
}

// In your Activity/Fragment setup:
webView.getSettings().setJavaScriptEnabled(true);
webView.addJavascriptInterface(new WebAppInterface(this), "Android");`,
    swift: `import UIKit
import WebKit

class WebviewViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        
        let contentController = WKUserContentController()
        // Register standard message handlers
        contentController.add(self, name: "closeWebview")
        contentController.add(self, name: "close")
        
        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        
        webView = WKWebView(frame: self.view.bounds, configuration: config)
        self.view.addSubview(webView)
    }

    // WKScriptMessageHandler Protocol Implementation
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "close" || message.name == "closeWebview" {
            // Safely close webview controller or dismiss navigation stack
            if let navigationController = self.navigationController {
                navigationController.popViewController(animated: true)
            } else {
                self.dismiss(animated: true, completion: nil)
            }
        }
    }
}`,
    objc: `#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

@interface WebviewViewController : UIViewController <WKScriptMessageHandler>
@property (nonatomic, strong) WKWebView *webView;
@end

@implementation WebviewViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    
    WKUserContentController *contentController = [[WKUserContentController alloc] init];
    [contentController addScriptMessageHandler:self name:@"closeWebview"];
    [contentController addScriptMessageHandler:self name:@"close"];
    
    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    config.userContentController = contentController;
    
    self.webView = [[WKWebView alloc] initWithFrame:self.view.bounds configuration:config];
    [self.view addSubview:self.webView];
}

- (void)userContentController:(WKUserContentController *)userContentController 
      didReceiveScriptMessage:(WKScriptMessage *)message {
    if ([message.name isEqualToString:@"close"] || [message.name isEqualToString:@"closeWebview"]) {
        if (self.navigationController) {
            [self.navigationController popViewControllerAnimated:YES];
        } else {
            [self dismissViewControllerAnimated:YES completion:nil];
        }
    }
}
@end`
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // Restore dashboard session for continuous browser testing
  const handleRestorePortal = () => {
    setIsClosed(false);
  };

  // Close WebView — targets Android JavascriptInterface bridge specifically
  const handleCloseWebView = () => {
    // Android WebView bridge: tries both common handler names
    if (window.Android) {
      if (typeof window.Android.closeWebview === 'function') {
        window.Android.closeWebview();
        return;
      }
      if (typeof window.Android.close === 'function') {
        window.Android.close();
        return;
      }
    }
    // Fallback for non-Android or missing bridge
    alert('CloseWebView: Android bridge not detected. This button only works inside an Android WebView with a registered JavascriptInterface.');
  };

  return (
    <>
      {!isClosed ? (
        <div className={`portal-container ${isCollapsing ? 'collapse-exit' : ''}`}>
          
          {/* Header Area */}
          <header className="portal-header">
            <div className="logo-section">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.4"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="logo-title">Aether Webview</span>
            </div>

            <div className="header-meta">
              <div className="status-badge">
                <span className="ping-dot"></span>
                <span>Active Link</span>
              </div>
              <span className="timestamp">{systemTime || '--:--:--'}</span>
              <button 
                className="mode-toggle"
                onClick={() => setIsDarkMode(!isDarkMode)}
                title="Toggle Mode"
                aria-label="Toggle Mode"
              >
                {isDarkMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="M4.93 4.93l1.41 1.41"></path>
                    <path d="M17.66 17.66l1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="M6.34 17.66l-1.41 1.41"></path>
                    <path d="M19.07 4.93l-1.41 1.41"></path>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                  </svg>
                )}
              </button>
            </div>
          </header>

          {/* Welcome Banner */}
          <section className="hero-banner">
            <h1>Webview Workspace</h1>
            <p>Welcome to Aether! This interactive sandboxed environment is designed to validate embedded browser layouts, JavaScript-to-Native bridge APIs, responsive viewports, and modal events in real time.</p>
          </section>

          {/* Core Feature Grid */}
          <div className="feature-grid">
            
            {/* Widget A: Theme Customizer */}
            <div className="feature-card">
              <div className="card-title-area">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.886a1 1 0 0 1-.95.69H2.93l4.993 3.627a1 1 0 0 1 .363 1.118L6.375 20.2 11.37 16.57a1 1 0 0 1 1.18 0l4.993 3.627-1.912-5.88a1 1 0 0 1 .363-1.118L20.99 9.576h-6.208a1 1 0 0 1-.95-.69L12 3Z"></path>
                </svg>
                <span>Portal Theme Palette</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select an accent color. This changes variable states, dynamically shifting colors and gradient glows with CSS.</p>
              <div className="theme-selector-group">
                <button 
                  className={`theme-btn ${activeTheme === 'cyberviolet' ? 'active' : ''}`}
                  onClick={() => setActiveTheme('cyberviolet')}
                >
                  <span className="color-preview preview-cyberviolet"></span>
                  <span>Cyber Violet</span>
                </button>
                <button 
                  className={`theme-btn ${activeTheme === 'sunsetamber' ? 'active' : ''}`}
                  onClick={() => setActiveTheme('sunsetamber')}
                >
                  <span className="color-preview preview-sunsetamber"></span>
                  <span>Sunset Amber</span>
                </button>
                <button 
                  className={`theme-btn ${activeTheme === 'emeraldaurora' ? 'active' : ''}`}
                  onClick={() => setActiveTheme('emeraldaurora')}
                >
                  <span className="color-preview preview-emeraldaurora"></span>
                  <span>Emerald Aurora</span>
                </button>
                <button 
                  className={`theme-btn ${activeTheme === 'oceanicwave' ? 'active' : ''}`}
                  onClick={() => setActiveTheme('oceanicwave')}
                >
                  <span className="color-preview preview-oceanicwave"></span>
                  <span>Oceanic Wave</span>
                </button>
              </div>
            </div>

            {/* Widget B: Interactive Telemetry slider */}
            <div className="feature-card">
              <div className="card-title-area">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h.01"></path>
                  <path d="M12 16h.01"></path>
                  <path d="M12 12h.01"></path>
                  <path d="M12 8h.01"></path>
                  <path d="M12 4h.01"></path>
                  <path d="M16 20h.01"></path>
                  <path d="M16 16h.01"></path>
                  <path d="M16 12h.01"></path>
                  <path d="M16 8h.01"></path>
                  <path d="M16 4h.01"></path>
                  <path d="M8 20h.01"></path>
                  <path d="M8 16h.01"></path>
                  <path d="M8 12h.01"></path>
                  <path d="M8 8h.01"></path>
                  <path d="M8 4h.01"></path>
                </svg>
                <span>Telemetry Control</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Drag the gauge control slider to manipulate application feedback telemetry metrics live.</p>
              
              <div className="telemetry-row">
                <div>
                  <span className="telemetry-val">{telemetryVal}</span>
                  <span className="telemetry-unit">% CPU load</span>
                </div>
                <span className="telemetry-status" style={{ 
                  color: telemetryVal > 85 ? '#ef4444' : telemetryVal > 60 ? '#f59e0b' : '#10b981',
                  background: telemetryVal > 85 ? 'rgba(239, 68, 68, 0.1)' : telemetryVal > 60 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                }}>
                  {telemetryVal > 85 ? 'Critical' : telemetryVal > 60 ? 'Warning' : 'Optimal'}
                </span>
              </div>

              <input 
                type="range" 
                min="0" 
                max="100" 
                value={telemetryVal} 
                onChange={(e) => setTelemetryVal(Number(e.target.value))}
                className="custom-range-slider"
              />

              <div className="progress-container">
                <div className="progress-fill" style={{ width: `${telemetryVal}%` }}></div>
              </div>
            </div>

          </div>

          {/* Native Bridge Code Integration Panel */}
          <div className="code-drawer-card">
            <div className="card-title-area">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>Native Shell Bridge Code Integration</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              To receive and process the Close action, integrate the corresponding bridge handlers on your native iOS/Android container:
            </p>

            <div className="code-tabs">
              {[
                { id: 'kotlin', label: 'Android (Kotlin)' },
                { id: 'java', label: 'Android (Java)' },
                { id: 'swift', label: 'iOS (Swift)' },
                { id: 'objc', label: 'iOS (Obj-C)' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`code-tab-btn ${activeCodeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveCodeTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="code-snippet-container">
              <div className="code-snippet-header">
                <span className="code-lang-label">
                  {activeCodeTab === 'kotlin' && 'WebAppInterface.kt'}
                  {activeCodeTab === 'java' && 'WebAppInterface.java'}
                  {activeCodeTab === 'swift' && 'WebviewViewController.swift'}
                  {activeCodeTab === 'objc' && 'WebviewViewController.m'}
                </span>
                <button className="btn-copy-code" onClick={handleCopyCode}>
                  {copiedState ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span style={{ color: '#10b981', marginLeft: '4px' }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                      </svg>
                      <span style={{ marginLeft: '4px' }}>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="code-display">
                <code>{codeSnippets[activeCodeTab]}</code>
              </pre>
            </div>
          </div>

          {/* Info Block */}
          <div className="info-block">
            <span className="info-title">WebView Debug Information</span>
            <span className="info-body">
              This client runtime detects native interfaces to allow closing container tabs programmatically. If run outside a webview container shell, clicking the close button simulated state logs the message payload, then displays a reconnect button for ease of sandboxed development.
            </span>
          </div>

          {/* Interactive Close Card Panel */}
          <section className="close-action-panel">
            <p>Ready to close your workspace connection? Pressing the button below dispatches event handlers and closes this frame.</p>
            <div className="button-row">
            <button 
              className="btn-close-portal"
              onClick={handleClosePortal}
              title="Close Portal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                <path d="m9 9 6 6"></path>
                <path d="m15 9-6 6"></path>
              </svg>
              <span>Close Portal Session</span>
            </button>
            <button
              className="btn-close-webview"
              onClick={handleCloseWebView}
              title="Close Android WebView"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                <path d="m9 9 6 6"></path>
                <path d="m15 9-6 6"></path>
              </svg>
              <span>CloseWebView</span>
            </button>
            </div>
          </section>

        </div>
      ) : (
        /* Disconnected View (Session terminated terminal mockup) */
        <div className="disconnected-container">
          <div className="disconnected-icon-area">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"></path>
              <path d="m6 6 12 12"></path>
            </svg>
          </div>

          <div>
            <h2 className="disconnected-title">Session Closed</h2>
            <p className="disconnected-desc">The webview window received a termination signal. Outbound events were dispatched across identified bridge interfaces successfully.</p>
          </div>

          {/* Outbound Bridge Call Logs Terminal */}
          <div className="terminal-block">
            <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #1e293b', paddingBottom: '6px', marginBottom: '4px' }}>
              Bridge Outbound Telemetry Output
            </div>
            {postMessageLogs.map((log, index) => (
              <div key={index} className="terminal-line">
                <span className="timestamp">[{(new Date()).toLocaleTimeString()}]</span>
                <span className="command">{log.bridge}:</span>
                <span className="payload">({log.status}) {log.payload}</span>
              </div>
            ))}
          </div>

          {/* Restore / Reconnect Button */}
          <button 
            className="btn-restore-portal"
            onClick={handleRestorePortal}
            title="Restore Portal Connection"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
              <path d="M16 16h5v5"></path>
            </svg>
            <span>Restore Connection</span>
          </button>
        </div>
      )}
    </>
  );
}

export default App;
