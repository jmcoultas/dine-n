Class: Client
The Client class represents a client that can be used to communicate with Object Storage from Replit. It provides methods for interacting with Objects stored in Object Storage Buckets.

Constructors
constructor
Creates a new client instance with optional configurations.

new Client(options?): Client
Parameters
Name	Type	Description
options?	ClientOptions	configurations to setup the client.
Returns
Returns a new instance of the Client class.

Client

Defined in
client.ts:120

Methods
The Client class provides the following methods for interacting with Objects stored in Object Storage Buckets. Each method offers functionality for performing specific operations such as copying, deleting, and downloading Objects.

copy
Copies the specified Object within the same Bucket. If an Object exists in the same location, it will be overwritten.

▸ copy(objectName, destObjectName): Promise<Result<null, RequestError>>

Parameters
Name	Type	Description
objectName	string	The full path of the Object to copy.
destObjectName	string	The full path to copy the Object to.
Returns
A promise that resolves when the operation is successful or rejects with an error.

Promise<Result<null, RequestError>>

Defined in
client.ts:184

delete
Deletes the specified Object from Object Storage.

▸ delete(objectName, options?): Promise<Result<null, RequestError>>

Parameters
Name	Type	Description
objectName	string	The full path of the Object to delete.
options?	DeleteOptions	Configurations for the delete operation.
Returns
A promise that resolves when the operation is successful or rejects with an error.

Promise<Result<null, RequestError>>

Defined in
client.ts:202

downloadAsBytes
Downloads an Object as a buffer containing the Object's raw contents.

▸ downloadAsBytes(objectName, options?): Promise<Result<[Buffer], RequestError>>

Parameters
Name	Type	Description
objectName	string	The full path of the Object to download.
options?	DownloadOptions	Configurations for the download operation.
Returns
A promise that resolves with a buffer containing the Object's contents or rejects with an error.

Promise<Result<[Buffer], RequestError>>

Defined in
client.ts:220

downloadAsStream
Opens a new stream and streams the Object's contents. If an error is encountered, it will be emitted through the stream.

▸ downloadAsStream(objectName, options?): Readable

Parameters
Name	Type	Description
objectName	string	The full path of the Object to download.
options?	DownloadOptions	Configurations for the download operation.
Returns
A readable stream containing the Object's contents.

Readable

Defined in
client.ts:283

downloadAsText
Downloads a Object to a string and returns the string.

▸ downloadAsText(objectName, options?): Promise<Result<string, RequestError>>

Parameters
Name	Type	Description
objectName	string	The full path of the Object to download.
options?	DownloadOptions	Configurations for the download operation.
Returns
A promise that resolves with a string containing the Object's contents or rejects with an error.

Promise<Result<string, RequestError>>

Defined in
client.ts:238

downloadToFilename
Downloads an Object to the local filesystem.

▸ downloadToFilename(objectName, destFilename, options?): Promise<Result<null, RequestError>>

Parameters
Name	Type	Description
objectName	string	The full path of the Object to download.
destFilename	string	The path on the local filesystem to write the downloaded Object to.
options?	DownloadOptions	Configurations for the download operation.
Returns
A promise that resolves when the operation is successful or rejects with an error.

Promise<Result<null, RequestError>>

Defined in
client.ts:258

exists
Checks whether the given Object exists.

▸ exists(objectName): Promise<Result<boolean, RequestError>>

Parameters
Name	Type	Description
objectName	string	The full path of the Object to check.
Returns
A promise that resolves with a boolean indicating whether the Object exists in the specified Bucket. If the Object exists, the promise resolves to true; otherwise, it resolves to false. If an error occurs during the operation, the promise rejects with a RequestError containing details about the error.

Promise<Result<boolean, RequestError>>

Defined in
client.ts:309

list
Lists Objects in the Bucket.

▸ list(options?): Promise<Result<StorageObject[], RequestError>>

Parameters
Name	Type	Description
options?	ListOptions	Configurations for the list operation.
Returns
A promise that resolves with an array of StorageObject instances representing the Objects in the Bucket. Each StorageObject contains metadata about a specific Object stored in the Bucket.

Promise<Result<StorageObject[], RequestError>>

Defined in
client.ts:323

uploadFromBytes
▸ uploadFromBytes(objectName, contents, options?): Promise<Result<null, RequestError>>

Uploads an Object from its in-memory byte representation. If an Object already exists with the specified name it will be overwritten.

Parameters
Name	Type	Description
objectName	string	The full destination path of the Object.
contents	Buffer	The raw contents of the Object in byte form.
options?	UploadOptions	Configurations for the upload operation.
Returns
Promise<Result<null, RequestError>>

Defined in
client.ts:347

uploadFromFilename
▸ uploadFromFilename(objectName, srcFilename, options?): Promise<Result<null, RequestError>>

Uploads an Object from a file on the local filesystem. If an Object already exists with the specified name it will be overwritten.

Parameters
Name	Type	Description
objectName	string	The full destination path of the Object.
srcFilename	string	The path of the file on the local filesystem to upload.
options?	UploadOptions	Configurations for the upload operation.
Returns
Promise<Result<null, RequestError>>

Defined in
client.ts:391

uploadFromStream
▸ uploadFromStream(objectName, stream, options?): Promise<void>

Uploads an Object by streaming its contents from the provided stream. If an error is encountered, it will be emitted through the stream. If an Object already exists with the specified name it will be overwritten.

Parameters
Name	Type	Description
objectName	string	The full destination path of the Object.
stream	Readable	A writeable stream the Object will be written from.
options?	UploadOptions	Configurations for the upload operation.
Returns
Promise<void>

Defined in
client.ts:416

uploadFromText
▸ uploadFromText(objectName, contents, options?): Promise<Result<null, RequestError>>

Uploads an Object from its in-memory text representation. If an Object already exists with the specified name it will be overwritten.

Parameters
Name	Type	Description
objectName	string	The full destination path of the Object.
contents	string	The contents of the Object in text form.
options?	UploadOptions	Configurations for the upload operation.
Returns
Promise<Result<null, RequestError>>

Defined in
client.ts:369