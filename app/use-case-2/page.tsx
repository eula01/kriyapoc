"use client";

import { useState } from 'react';

interface Company {
  name: string;
  domain: string;
}

interface Contact {
  name: string;
  title: string;
  linkedin: string;
  email: string;
  phone: string | null;
  company: Company;
}

interface ApiResponse {
  success: boolean;
  contact: Contact;
}

export default function UseCase2Page() {
  const [companyInput, setCompanyInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/two', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: companyInput,
          name: nameInput,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Contact Finder</h1>
      
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium mb-1">
            CRN or Company Website
          </label>
          <input
            id="company"
            type="text"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g., postman.com"
            required
          />
        </div>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g., Abhijit Kane"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400"
        >
          {loading ? 'Searching...' : 'Find Contact'}
        </button>
      </form>
      
      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md text-red-600">
          {error}
        </div>
      )}
      
      {result && (
        <div className="border rounded-md p-6 bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          
          {result.success ? (
            <div className="space-y-2">
              <div className="flex">
                <div className="w-1/3 font-medium">Name:</div>
                <div>{result.contact.name}</div>
              </div>
              
              <div className="flex">
                <div className="w-1/3 font-medium">Title:</div>
                <div>{result.contact.title}</div>
              </div>
              
              <div className="flex">
                <div className="w-1/3 font-medium">Email:</div>
                <div>
                  <a href={`mailto:${result.contact.email}`} className="text-blue-600 hover:underline">
                    {result.contact.email}
                  </a>
                </div>
              </div>
              
              <div className="flex">
                <div className="w-1/3 font-medium">LinkedIn:</div>
                <div>
                  <a href={result.contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {result.contact.linkedin}
                  </a>
                </div>
              </div>
              
              {result.contact.phone && (
                <div className="flex">
                  <div className="w-1/3 font-medium">Phone:</div>
                  <div>
                    <a href={`tel:${result.contact.phone}`} className="text-blue-600 hover:underline">
                      {result.contact.phone}
                    </a>
                  </div>
                </div>
              )}
              
              <div className="flex">
                <div className="w-1/3 font-medium">Company:</div>
                <div>
                  {result.contact.company.name || result.contact.company.domain}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-600">Unable to find contact information.</div>
          )}
        </div>
      )}
    </div>
  );
}
