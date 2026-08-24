export const notFound = (req,res) => res.status(404).json({ success:false, error:{ code:'NOT_FOUND', message:`No route for ${req.method} ${req.path}` } });
export const errorHandler = (error,_req,res,_next) => {
  const status = error.status || (error.name==='ValidationError'?400:500);
  if (status>=500) console.error(error);
  res.status(status).json({ success:false, error:{ code:error.code || 'REQUEST_FAILED', message:error.message || 'Something went wrong', ...(error.details?{details:error.details}:{}) } });
};
