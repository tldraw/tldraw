import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'ij3ytvrl',
  dataset: 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
  token: 'skHEbHR14tvOyz0mmBU3sL2xrFOrq7svor3dAreDAUtJK4bGnJbaJwc7DLF5Dw0FPUZuhwwyZbnXEuE3FBwFpS4qdRw1uCQHH3UP8gnJmRSNFuX1qjmuJq5mhtZm99EuzWE403iD3Hm3xLqq2RyZ4fVjAW1q0ASb924k1kQJru032uUSv9Hh',
});

async function createShowcasePage() {
  try {
    const entries = await client.fetch('*[_type == "showcaseEntry"] | order(order asc)[0...8]');
    console.log('Found', entries.length, 'showcase entries');
    
    const result = await client.create({
      _type: 'showcasePage',
      heroTitle: 'Made with tldraw',
      heroSubtitle: 'Discover how teams are building with the tldraw SDK.',
      logoBarEntries: entries.slice(0, 8).map(e => ({
        _type: 'reference',
        _ref: e._id,
        _key: e._id,
      })),
      showcaseTitle: 'Showcase',
      showcaseSubtitle: 'Across industries, teams are building world-class experiences with the tldraw SDK.',
      showAndTellTitle: 'Show and tell',
      showAndTellDescription: 'Have you built something cool with tldraw? We would love to hear about it! Share your project with the community.',
      projectsTitle: 'Projects',
      projectsSubtitle: 'The tldraw SDK gives you a production-ready foundation out of the box. Skip the canvas setup and focus on what makes your product unique.',
      projects: [
        {
          _type: 'object',
          _key: 'project1',
          name: 'Make Real',
          description: 'Draw a mockup of a user interface and Make Real brings it to life as working HTML.',
          url: 'https://makereal.tldraw.com',
          linkLabel: 'Try it',
        }
      ],
    });
    
    console.log('Created showcase page:', result._id);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

createShowcasePage();
