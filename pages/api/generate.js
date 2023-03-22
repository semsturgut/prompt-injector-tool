import { Configuration, OpenAIApi } from "openai";
import { RateLimiterMemory } from 'rate-limiter-flexible';

const max_tokens = 1000;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const rateLimiter = new RateLimiterMemory({
  points: 1,
  duration: 30,
});

async function createChatCompletion(
  systemPrompt = '',
  userPrompt = '',
) {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    max_tokens: max_tokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response;
}

export default async function handler(req, res) {
  const isAllowed = await rateLimiterMiddleware(req, res);
  if (!isAllowed) return;
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message: "OpenAI API key not configured",
      }
    });
    return;
  }

  const prompt = req.body.prompt || '';
  const systemPrompt = req.body.systemPrompt || '';

  if (prompt.trim().length === 0 || prompt.trim().length > max_tokens || systemPrompt.trim().length === 0 || systemPrompt.trim().length > max_tokens) {
    res.status(400).json({
      error: {
        message: "Please enter a valid prompt",
      }
    });
    return;
  }

  try {
    const response = await createChatCompletion(
      systemPrompt,
      prompt,
    );

    res.status(200).json({ result: response.data.choices[0].message.content });
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        }
      });
    }
  }
}

async function rateLimiterMiddleware(req, res) {
  try {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await rateLimiter.consume(clientIP);
    return true;
  } catch (error) {
    return res.status(429).json({
      error: {
        message: 'Too many requests from this IP, please try again after 30 seconds',
      }
    });
  }
}
