import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <CardDescription>
              Last updated: {new Date().toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh] pr-4">
              <div className="space-y-8 text-sm leading-relaxed">
                
                {/* Introduction */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
                  <p className="mb-4">
                    At Dine-N ("we," "our," or "us"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our meal planning application and related services.
                  </p>
                  <p>
                    By using our Service, you consent to the data practices described in this policy.
                  </p>
                </section>

                {/* Information We Collect */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Personal Information</h3>
                      <p className="mb-2">We collect the following personal information when you create an account:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Name</li>
                        <li>Email address</li>
                        <li>Password (encrypted)</li>
                        <li>Dietary preferences and restrictions</li>
                        <li>Food allergies and intolerances</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Usage Data</h3>
                      <p className="mb-2">We automatically collect certain information when you use our Service:</p>
                      <ul className="list-disc pl-6 space-y-1">
                        <li>Page views and navigation patterns</li>
                        <li>Feature usage statistics</li>
                        <li>Device information (browser type, operating system)</li>
                        <li>IP address (anonymized)</li>
                        <li>Session duration and frequency</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Generated Content</h3>
                      <p>We store meal plans, recipes, and preferences you generate or save through our AI system to provide personalized recommendations and improve our service.</p>
                    </div>
                  </div>
                </section>

                {/* How We Use Your Information */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
                  <p className="mb-4">We use the collected information for the following purposes:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Service Provision:</strong> To provide personalized meal plans and recipe recommendations</li>
                    <li><strong>Account Management:</strong> To create and manage your user account</li>
                    <li><strong>Communication:</strong> To send service-related notifications and updates</li>
                    <li><strong>Improvement:</strong> To analyze usage patterns and improve our AI algorithms</li>
                    <li><strong>Safety:</strong> To accommodate dietary restrictions and allergies</li>
                    <li><strong>Support:</strong> To provide customer service and technical support</li>
                    <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                  </ul>
                </section>

                {/* Data Sharing and Disclosure */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">🔒 Our Commitment</h3>
                    <p className="text-green-700 dark:text-green-300">
                      We do not sell, trade, or rent your personal information to third parties for marketing purposes.
                    </p>
                  </div>
                  
                  <p className="mb-4">We may share your information only in the following limited circumstances:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our platform (e.g., hosting, payment processing, analytics)</li>
                    <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
                    <li><strong>Safety:</strong> To protect the rights, property, or safety of Dine-N, our users, or others</li>
                    <li><strong>Business Transfer:</strong> In connection with a merger, acquisition, or sale of assets (with notice to users)</li>
                  </ul>
                </section>

                {/* Analytics and Tracking */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">5. Analytics and Tracking</h2>
                  <div className="space-y-4">
                    <p>
                      <strong>Minimal Analytics:</strong> We use basic analytics to understand how our service is used and to identify areas for improvement. This includes:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Page views and user interactions</li>
                      <li>Feature usage patterns</li>
                      <li>Performance metrics</li>
                      <li>Error logs</li>
                    </ul>
                    <p>
                      <strong>No Personal Data in Analytics:</strong> All analytics data is anonymized and aggregated. We do not track individual user behavior for advertising purposes.
                    </p>
                    <p>
                      <strong>No Third-Party Advertising:</strong> We do not use advertising networks or share data with advertisers.
                    </p>
                  </div>
                </section>

                {/* Data Security */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">6. Data Security</h2>
                  <div className="space-y-4">
                    <p>We implement appropriate technical and organizational measures to protect your personal information:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Encryption:</strong> Data is encrypted in transit and at rest</li>
                      <li><strong>Access Controls:</strong> Limited access to personal data on a need-to-know basis</li>
                      <li><strong>Regular Updates:</strong> Security measures are regularly reviewed and updated</li>
                      <li><strong>Secure Infrastructure:</strong> We use reputable cloud providers with strong security practices</li>
                    </ul>
                    <p className="mt-4">
                      However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                    </p>
                  </div>
                </section>

                {/* Data Retention */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">7. Data Retention</h2>
                  <div className="space-y-4">
                    <p>We retain your personal information for as long as necessary to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Provide our services to you</li>
                      <li>Comply with legal obligations</li>
                      <li>Resolve disputes</li>
                      <li>Enforce our agreements</li>
                    </ul>
                    <p>
                      When you delete your account, we will delete your personal information within 30 days, except where we are required to retain it for legal purposes.
                    </p>
                  </div>
                </section>

                {/* Your Rights */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">8. Your Rights</h2>
                  <div className="space-y-4">
                    <p>You have the following rights regarding your personal information:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                      <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                      <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                      <li><strong>Portability:</strong> Request a copy of your data in a machine-readable format</li>
                      <li><strong>Objection:</strong> Object to certain processing of your personal information</li>
                      <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                    </ul>
                    <p>
                      To exercise these rights, please contact us at privacy@dine-n.com. We will respond to your request within 30 days.
                    </p>
                  </div>
                </section>

                {/* Cookies and Similar Technologies */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">9. Cookies and Similar Technologies</h2>
                  <div className="space-y-4">
                    <p>We use cookies and similar technologies to:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Keep you logged in</li>
                      <li>Remember your preferences</li>
                      <li>Analyze site usage</li>
                      <li>Improve site performance</li>
                    </ul>
                    <p>
                      You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our service.
                    </p>
                  </div>
                </section>

                {/* Children's Privacy */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
                  <p className="mb-4">
                    Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                  </p>
                  <p>
                    Users between 13 and 18 years old must have parental consent to use our Service.
                  </p>
                </section>

                {/* International Data Transfers */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">11. International Data Transfers</h2>
                  <p className="mb-4">
                    Your information may be transferred to and processed in countries other than your own. We ensure that such transfers are conducted in accordance with applicable data protection laws and that appropriate safeguards are in place.
                  </p>
                </section>

                {/* Changes to This Policy */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">12. Changes to This Privacy Policy</h2>
                  <p className="mb-4">
                    We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through our Service at least 30 days before the changes take effect.
                  </p>
                  <p>
                    Your continued use of the Service after changes become effective constitutes acceptance of the updated Privacy Policy.
                  </p>
                </section>

                {/* Contact Information */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">13. Contact Us</h2>
                  <p className="mb-4">
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-blue-900 dark:text-blue-100"><strong>Email:</strong> privacy@dine-n.com</p>
                    <p className="text-blue-900 dark:text-blue-100"><strong>Data Protection Officer:</strong> dpo@dine-n.com</p>
                    <p className="text-blue-900 dark:text-blue-100"><strong>Address:</strong> [Your Business Address]</p>
                    <p className="text-blue-900 dark:text-blue-100"><strong>Phone:</strong> [Your Phone Number]</p>
                  </div>
                </section>

                {/* Acknowledgment */}
                <section className="border-t pt-6">
                  <h2 className="text-xl font-semibold mb-4">Acknowledgment</h2>
                  <p className="font-medium">
                    By using Dine-N, you acknowledge that you have read, understood, and agree to this Privacy Policy. You understand how we collect, use, and protect your personal information.
                  </p>
                </section>

              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 