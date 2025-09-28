#!/usr/bin/env python3
import http.server
import socketserver
import os

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # เพิ่ม headers เพื่อป้องกัน caching
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # พิมพ์ log ที่เหมาะสม
        print(f"[{self.address_string()}] {format % args}")

if __name__ == "__main__":
    PORT = 5000
    
    # เปลี่ยน directory ไปที่ directory ที่มีไฟล์ HTML
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("0.0.0.0", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Server running at http://0.0.0.0:{PORT}/")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.shutdown()