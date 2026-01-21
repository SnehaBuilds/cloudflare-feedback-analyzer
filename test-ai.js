export default {
  async fetch(request, env) {
    // Test with clearly positive text
    const result = await env.AI.run('@cf/huggingface/distilbert-sst-2-int8', {
      text: "I absolutely love this! It's amazing and wonderful!"
    });
    return new Response(JSON.stringify(result, null, 2));
  }
}
