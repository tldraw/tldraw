import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ij3ytvrl',
  dataset: 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
  token: 'skHEbHR14tvOyz0mmBU3sL2xrFOrq7svor3dAreDAUtJK4bGnJbaJwc7DLF5Dw0FPUZuhwwyZbnXEuE3FBwFpS4qdRw1uCQHH3UP8gnJmRSNFuX1qjmuJq5mhtZm99EuzWE403iD3Hm3xLqq2RyZ4fVjAW1q0ASb924k1kQJru032uUSv9Hh',
});

async function addTestimonial() {
  try {
    // Create testimonial
    const testimonial = await client.create({
      _type: 'testimonial',
      quote: 'tldraw\'s technology revolutionized how we deliver a high-quality foundational experience while maintaining flexibility and ease of use. This is where great docs live now.',
      author: 'Product Team',
      role: 'Engineering Lead',
      company: 'Leading Tech Company',
      useInPullQuote: true,
    });
    
    console.log('Created testimonial:', testimonial._id);
    
    // Update showcase page with testimonial and case studies
    const page = await client.fetch('*[_type == "showcasePage"][0]');
    
    const result = await client
      .patch(page._id)
      .set({
        testimonial: {
          _type: 'reference',
          _ref: testimonial._id,
        },
        caseStudySummaries: [
          {
            _type: 'object',
            _key: 'clickup',
            heading: 'ClickUp',
            description: 'How ClickUp uses tldraw to deliver a best-in-class whiteboarding experience to millions of users.',
            url: '/blog/case-study-clickup',
          },
          {
            _type: 'object',
            _key: 'padlet',
            heading: 'Padlet',
            description: 'How Padlet leverages tldraw to power collaborative learning experiences in education.',
            url: '/blog/case-study-padlet',
          },
        ],
      })
      .commit();
    
    console.log('Updated showcase page with testimonial and case studies');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addTestimonial();
