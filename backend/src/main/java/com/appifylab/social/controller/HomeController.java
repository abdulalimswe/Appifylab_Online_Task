package com.appifylab.social.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping(value = "/", produces = MediaType.TEXT_HTML_VALUE)
    public String home() {
        return """
                <!doctype html>
                <html lang=\"en\">
                <head>
                  <meta charset=\"UTF-8\" />
                  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
                  <title>Appifylab Backend</title>
                  <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f7fb; color: #1f2937; }
                    .card { max-width: 760px; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
                    h1 { margin-top: 0; }
                    code { background: #eef2ff; padding: 2px 6px; border-radius: 6px; }
                  </style>
                </head>
                <body>
                  <div class=\"card\">
                    <h1>Backend server is running</h1>
                    <p>Appifylab Social Backend is live on Render.</p>
                    <p>Try auth API: <code>/api/auth/login</code> and <code>/api/auth/register</code></p>
                  </div>
                </body>
                </html>
                """;
    }
}

