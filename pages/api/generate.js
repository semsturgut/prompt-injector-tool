import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function createChatCompletion(
  systemPrompt = '',
  userPrompt = '',
) {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    max_tokens: 250,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return response;
}

export default async function (req, res) {
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

  if (prompt.trim().length === 0 || prompt.trim().length > 250 || systemPrompt.trim().length === 0 || systemPrompt.trim().length > 250) {
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