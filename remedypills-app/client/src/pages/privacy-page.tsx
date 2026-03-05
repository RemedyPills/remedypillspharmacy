import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                RemedyPills Pharmacy ("we", "us", "our", or "Company") operates the mobile application. 
                This page informs you of our policies regarding the collection, use, and disclosure of 
                personal data when you use our service and the choices you have associated with that data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information Collection and Use</h2>
              <p className="text-gray-700 mb-3">We collect several different types of information for various purposes:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Personal Data:</strong> Name, email address, phone number, date of birth</li>
                <li><strong>Healthcare Information:</strong> Prescription details, appointment history, health logs</li>
                <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, time and date of visits</li>
                <li><strong>Social Media Data:</strong> If you use Facebook or Google login, we collect profile information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Use of Data</h2>
              <p className="text-gray-700 mb-3">RemedyPills Pharmacy uses the collected data for various purposes:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>To provide and maintain our service</li>
                <li>To manage prescriptions and appointments</li>
                <li>To send promotional, marketing, and transactional communications</li>
                <li>To detect and prevent fraud or security issues</li>
                <li>To improve and optimize our application</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
              <p className="text-gray-700">
                We will retain your personal data only for as long as necessary for the purposes set out in 
                this Privacy Policy. However, we may retain personal data for a longer period when required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Data Deletion Requests</h2>
              <p className="text-gray-700 mb-3">
                You have the right to request deletion of your personal data. You can:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Request deletion directly within the application settings</li>
                <li>Contact us via email with your deletion request</li>
                <li>If you used Facebook or Google login, you can also request deletion through those platforms</li>
              </ul>
              <p className="text-gray-700 mt-3">
                When we receive a deletion request, we will remove all personal data associated with your account 
                within 30 days, unless legally required to retain it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
              <p className="text-gray-700">
                Our application uses third-party services including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mt-3">
                <li><strong>Facebook Login:</strong> For authentication purposes</li>
                <li><strong>Google Login:</strong> For authentication purposes</li>
                <li><strong>Twilio:</strong> For SMS notifications</li>
                <li><strong>Email services:</strong> For appointment and prescription communications</li>
              </ul>
              <p className="text-gray-700 mt-3">
                These third parties have their own privacy policies governing the use of information they collect from you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Security of Data</h2>
              <p className="text-gray-700">
                The security of your data is important to us, but remember that no method of transmission over 
                the Internet is 100% secure. We use encrypted connections (HTTPS) and follow industry best practices 
                to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-gray-50 rounded">
                <p className="text-gray-700"><strong>Email:</strong> privacy@remedypills.com</p>
                <p className="text-gray-700"><strong>Address:</strong> RemedyPills Pharmacy, Pharmacy Street, City, Country</p>
              </div>
            </section>

            <section className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-sm font-semibold text-blue-900 mb-2">Data Deletion Confirmation</h2>
              <p className="text-sm text-blue-800">
                If you have submitted a data deletion request, we will send you a confirmation email once 
                your data has been completely removed from our systems.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
